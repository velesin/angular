import { isBlank, isPresent, StringWrapper } from 'angular2/src/facade/lang';
import { ListWrapper, StringMapWrapper } from 'angular2/src/facade/collection';
import { EventHandlerVars, ViewProperties } from './constants';
import * as o from '../output/output_ast';
import { CompileMethod } from './compile_method';
import { convertCdStatementToIr } from './expression_converter';
import { CompileBinding } from './compile_binding';
export class CompileEventListener {
    constructor(compileElement, eventTarget, eventName, listenerIndex) {
        this.compileElement = compileElement;
        this.eventTarget = eventTarget;
        this.eventName = eventName;
        this._hasComponentHostListener = false;
        this._actionResultExprs = [];
        this._method = new CompileMethod(compileElement.view);
        this._methodName =
            `_handle_${santitizeEventName(eventName)}_${compileElement.nodeIndex}_${listenerIndex}`;
        this._eventParam =
            new o.FnParam(EventHandlerVars.event.name, o.importType(this.compileElement.view.genConfig.renderTypes.renderEvent));
    }
    static getOrCreate(compileElement, eventTarget, eventName, targetEventListeners) {
        var listener = targetEventListeners.find(listener => listener.eventTarget == eventTarget &&
            listener.eventName == eventName);
        if (isBlank(listener)) {
            listener = new CompileEventListener(compileElement, eventTarget, eventName, targetEventListeners.length);
            targetEventListeners.push(listener);
        }
        return listener;
    }
    addAction(hostEvent, directive, directiveInstance) {
        if (isPresent(directive) && directive.isComponent) {
            this._hasComponentHostListener = true;
        }
        this._method.resetDebugInfo(this.compileElement.nodeIndex, hostEvent);
        var context = isPresent(directiveInstance) ? directiveInstance :
            this.compileElement.view.componentContext;
        var actionStmts = convertCdStatementToIr(this.compileElement.view, context, hostEvent.handler);
        var lastIndex = actionStmts.length - 1;
        if (lastIndex >= 0) {
            var lastStatement = actionStmts[lastIndex];
            var returnExpr = convertStmtIntoExpression(lastStatement);
            var preventDefaultVar = o.variable(`pd_${this._actionResultExprs.length}`);
            this._actionResultExprs.push(preventDefaultVar);
            if (isPresent(returnExpr)) {
                // Note: We need to cast the result of the method call to dynamic,
                // as it might be a void method!
                actionStmts[lastIndex] =
                    preventDefaultVar.set(returnExpr.cast(o.DYNAMIC_TYPE).notIdentical(o.literal(false)))
                        .toDeclStmt(null, [o.StmtModifier.Final]);
            }
        }
        this._method.addStmts(actionStmts);
    }
    finishMethod() {
        var markPathToRootStart = this._hasComponentHostListener ?
            this.compileElement.appElement.prop('componentView') :
            o.THIS_EXPR;
        var resultExpr = o.literal(true);
        this._actionResultExprs.forEach((expr) => { resultExpr = resultExpr.and(expr); });
        var stmts = [markPathToRootStart.callMethod('markPathToRootAsCheckOnce', []).toStmt()]
            .concat(this._method.finish())
            .concat([new o.ReturnStatement(resultExpr)]);
        // private is fine here as no child view will reference the event handler...
        this.compileElement.view.eventHandlerMethods.push(new o.ClassMethod(this._methodName, [this._eventParam], stmts, o.BOOL_TYPE, [o.StmtModifier.Private]));
    }
    listenToRenderer() {
        var listenExpr;
        var eventListener = o.THIS_EXPR.callMethod('eventHandler', [o.THIS_EXPR.prop(this._methodName).callMethod(o.BuiltinMethod.bind, [o.THIS_EXPR])]);
        if (isPresent(this.eventTarget)) {
            listenExpr = ViewProperties.renderer.callMethod('listenGlobal', [o.literal(this.eventTarget), o.literal(this.eventName), eventListener]);
        }
        else {
            listenExpr = ViewProperties.renderer.callMethod('listen', [this.compileElement.renderNode, o.literal(this.eventName), eventListener]);
        }
        var disposable = o.variable(`disposable_${this.compileElement.view.disposables.length}`);
        this.compileElement.view.disposables.push(disposable);
        // private is fine here as no child view will reference the event handler...
        this.compileElement.view.createMethod.addStmt(disposable.set(listenExpr).toDeclStmt(o.FUNCTION_TYPE, [o.StmtModifier.Private]));
    }
    listenToDirective(directiveInstance, observablePropName) {
        var subscription = o.variable(`subscription_${this.compileElement.view.subscriptions.length}`);
        this.compileElement.view.subscriptions.push(subscription);
        var eventListener = o.THIS_EXPR.callMethod('eventHandler', [o.THIS_EXPR.prop(this._methodName).callMethod(o.BuiltinMethod.bind, [o.THIS_EXPR])]);
        this.compileElement.view.createMethod.addStmt(subscription.set(directiveInstance.prop(observablePropName)
            .callMethod(o.BuiltinMethod.SubscribeObservable, [eventListener]))
            .toDeclStmt(null, [o.StmtModifier.Final]));
    }
}
export function collectEventListeners(hostEvents, dirs, compileElement) {
    var eventListeners = [];
    hostEvents.forEach((hostEvent) => {
        compileElement.view.bindings.push(new CompileBinding(compileElement, hostEvent));
        var listener = CompileEventListener.getOrCreate(compileElement, hostEvent.target, hostEvent.name, eventListeners);
        listener.addAction(hostEvent, null, null);
    });
    ListWrapper.forEachWithIndex(dirs, (directiveAst, i) => {
        var directiveInstance = compileElement.directiveInstances[i];
        directiveAst.hostEvents.forEach((hostEvent) => {
            compileElement.view.bindings.push(new CompileBinding(compileElement, hostEvent));
            var listener = CompileEventListener.getOrCreate(compileElement, hostEvent.target, hostEvent.name, eventListeners);
            listener.addAction(hostEvent, directiveAst.directive, directiveInstance);
        });
    });
    eventListeners.forEach((listener) => listener.finishMethod());
    return eventListeners;
}
export function bindDirectiveOutputs(directiveAst, directiveInstance, eventListeners) {
    StringMapWrapper.forEach(directiveAst.directive.outputs, (eventName, observablePropName) => {
        eventListeners.filter(listener => listener.eventName == eventName)
            .forEach((listener) => { listener.listenToDirective(directiveInstance, observablePropName); });
    });
}
export function bindRenderOutputs(eventListeners) {
    eventListeners.forEach(listener => listener.listenToRenderer());
}
function convertStmtIntoExpression(stmt) {
    if (stmt instanceof o.ExpressionStatement) {
        return stmt.expr;
    }
    else if (stmt instanceof o.ReturnStatement) {
        return stmt.value;
    }
    return null;
}
function santitizeEventName(name) {
    return StringWrapper.replaceAll(name, /[^a-zA-Z_]/g, '_');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRfYmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1HdjFSM0ZWai50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3ZpZXdfY29tcGlsZXIvZXZlbnRfYmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUMsTUFBTSwwQkFBMEI7T0FDbkUsRUFBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxnQ0FBZ0M7T0FDckUsRUFBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUMsTUFBTSxhQUFhO09BRXJELEtBQUssQ0FBQyxNQUFNLHNCQUFzQjtPQUVsQyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQjtPQUt2QyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sd0JBQXdCO09BQ3RELEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CO0FBRWhEO0lBbUJFLFlBQW1CLGNBQThCLEVBQVMsV0FBbUIsRUFDMUQsU0FBaUIsRUFBRSxhQUFxQjtRQUR4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBUyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUMxRCxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBbEI1Qiw4QkFBeUIsR0FBWSxLQUFLLENBQUM7UUFHM0MsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztRQWdCOUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFdBQVc7WUFDWixXQUFXLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxTQUFTLElBQUksYUFBYSxFQUFFLENBQUM7UUFDNUYsSUFBSSxDQUFDLFdBQVc7WUFDWixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksRUFDM0Is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QUFRLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELGtDQUFrQyxjQUFzQztJQUN0RSxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxtQ0FBbUMsSUFBaUI7SUFDbEQsRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDcEIsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsNEJBQTRCLElBQVk7SUFDdEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM1RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtpc0JsYW5rLCBpc1ByZXNlbnQsIFN0cmluZ1dyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0xpc3RXcmFwcGVyLCBTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtFdmVudEhhbmRsZXJWYXJzLCBWaWV3UHJvcGVydGllc30gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5pbXBvcnQgKiBhcyBvIGZyb20gJy4uL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7Q29tcGlsZUVsZW1lbnR9IGZyb20gJy4vY29tcGlsZV9lbGVtZW50JztcbmltcG9ydCB7Q29tcGlsZU1ldGhvZH0gZnJvbSAnLi9jb21waWxlX21ldGhvZCc7XG5cbmltcG9ydCB7Qm91bmRFdmVudEFzdCwgRGlyZWN0aXZlQXN0fSBmcm9tICcuLi90ZW1wbGF0ZV9hc3QnO1xuaW1wb3J0IHtDb21waWxlRGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJy4uL2NvbXBpbGVfbWV0YWRhdGEnO1xuXG5pbXBvcnQge2NvbnZlcnRDZFN0YXRlbWVudFRvSXJ9IGZyb20gJy4vZXhwcmVzc2lvbl9jb252ZXJ0ZXInO1xuaW1wb3J0IHtDb21waWxlQmluZGluZ30gZnJvbSAnLi9jb21waWxlX2JpbmRpbmcnO1xuXG5leHBvcnQgY2xhc3MgQ29tcGlsZUV2ZW50TGlzdGVuZXIge1xuICBwcml2YXRlIF9tZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHByaXZhdGUgX2hhc0NvbXBvbmVudEhvc3RMaXN0ZW5lcjogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9tZXRob2ROYW1lOiBzdHJpbmc7XG4gIHByaXZhdGUgX2V2ZW50UGFyYW06IG8uRm5QYXJhbTtcbiAgcHJpdmF0ZSBfYWN0aW9uUmVzdWx0RXhwcnM6IG8uRXhwcmVzc2lvbltdID0gW107XG5cbiAgc3RhdGljIGdldE9yQ3JlYXRlKGNvbXBpbGVFbGVtZW50OiBDb21waWxlRWxlbWVudCwgZXZlbnRUYXJnZXQ6IHN0cmluZywgZXZlbnROYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudExpc3RlbmVyczogQ29tcGlsZUV2ZW50TGlzdGVuZXJbXSk6IENvbXBpbGVFdmVudExpc3RlbmVyIHtcbiAgICB2YXIgbGlzdGVuZXIgPSB0YXJnZXRFdmVudExpc3RlbmVycy5maW5kKGxpc3RlbmVyID0+IGxpc3RlbmVyLmV2ZW50VGFyZ2V0ID09IGV2ZW50VGFyZ2V0ICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5ldmVudE5hbWUgPT0gZXZlbnROYW1lKTtcbiAgICBpZiAoaXNCbGFuayhsaXN0ZW5lcikpIHtcbiAgICAgIGxpc3RlbmVyID0gbmV3IENvbXBpbGVFdmVudExpc3RlbmVyKGNvbXBpbGVFbGVtZW50LCBldmVudFRhcmdldCwgZXZlbnROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnRMaXN0ZW5lcnMubGVuZ3RoKTtcbiAgICAgIHRhcmdldEV2ZW50TGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdGVuZXI7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcGlsZUVsZW1lbnQ6IENvbXBpbGVFbGVtZW50LCBwdWJsaWMgZXZlbnRUYXJnZXQ6IHN0cmluZyxcbiAgICAgICAgICAgICAgcHVibGljIGV2ZW50TmFtZTogc3RyaW5nLCBsaXN0ZW5lckluZGV4OiBudW1iZXIpIHtcbiAgICB0aGlzLl9tZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZChjb21waWxlRWxlbWVudC52aWV3KTtcbiAgICB0aGlzLl9tZXRob2ROYW1lID1cbiAgICAgICAgYF9oYW5kbGVfJHtzYW50aXRpemVFdmVudE5hbWUoZXZlbnROYW1lKX1fJHtjb21waWxlRWxlbWVudC5ub2RlSW5kZXh9XyR7bGlzdGVuZXJJbmRleH1gO1xuICAgIHRoaXMuX2V2ZW50UGFyYW0gPVxuICAgICAgICBuZXcgby5GblBhcmFtKEV2ZW50SGFuZGxlclZhcnMuZXZlbnQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICBvLmltcG9ydFR5cGUodGhpcy5jb21waWxlRWxlbWVudC52aWV3LmdlbkNvbmZpZy5yZW5kZXJUeXBlcy5yZW5kZXJFdmVudCkpO1xuICB9XG5cbiAgYWRkQWN0aW9uKGhvc3RFdmVudDogQm91bmRFdmVudEFzdCwgZGlyZWN0aXZlOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsXG4gICAgICAgICAgICBkaXJlY3RpdmVJbnN0YW5jZTogby5FeHByZXNzaW9uKSB7XG4gICAgaWYgKGlzUHJlc2VudChkaXJlY3RpdmUpICYmIGRpcmVjdGl2ZS5pc0NvbXBvbmVudCkge1xuICAgICAgdGhpcy5faGFzQ29tcG9uZW50SG9zdExpc3RlbmVyID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fbWV0aG9kLnJlc2V0RGVidWdJbmZvKHRoaXMuY29tcGlsZUVsZW1lbnQubm9kZUluZGV4LCBob3N0RXZlbnQpO1xuICAgIHZhciBjb250ZXh0ID0gaXNQcmVzZW50KGRpcmVjdGl2ZUluc3RhbmNlKSA/IGRpcmVjdGl2ZUluc3RhbmNlIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuY29tcG9uZW50Q29udGV4dDtcbiAgICB2YXIgYWN0aW9uU3RtdHMgPSBjb252ZXJ0Q2RTdGF0ZW1lbnRUb0lyKHRoaXMuY29tcGlsZUVsZW1lbnQudmlldywgY29udGV4dCwgaG9zdEV2ZW50LmhhbmRsZXIpO1xuICAgIHZhciBsYXN0SW5kZXggPSBhY3Rpb25TdG10cy5sZW5ndGggLSAxO1xuICAgIGlmIChsYXN0SW5kZXggPj0gMCkge1xuICAgICAgdmFyIGxhc3RTdGF0ZW1lbnQgPSBhY3Rpb25TdG10c1tsYXN0SW5kZXhdO1xuICAgICAgdmFyIHJldHVybkV4cHIgPSBjb252ZXJ0U3RtdEludG9FeHByZXNzaW9uKGxhc3RTdGF0ZW1lbnQpO1xuICAgICAgdmFyIHByZXZlbnREZWZhdWx0VmFyID0gby52YXJpYWJsZShgcGRfJHt0aGlzLl9hY3Rpb25SZXN1bHRFeHBycy5sZW5ndGh9YCk7XG4gICAgICB0aGlzLl9hY3Rpb25SZXN1bHRFeHBycy5wdXNoKHByZXZlbnREZWZhdWx0VmFyKTtcbiAgICAgIGlmIChpc1ByZXNlbnQocmV0dXJuRXhwcikpIHtcbiAgICAgICAgLy8gTm90ZTogV2UgbmVlZCB0byBjYXN0IHRoZSByZXN1bHQgb2YgdGhlIG1ldGhvZCBjYWxsIHRvIGR5bmFtaWMsXG4gICAgICAgIC8vIGFzIGl0IG1pZ2h0IGJlIGEgdm9pZCBtZXRob2QhXG4gICAgICAgIGFjdGlvblN0bXRzW2xhc3RJbmRleF0gPVxuICAgICAgICAgICAgcHJldmVudERlZmF1bHRWYXIuc2V0KHJldHVybkV4cHIuY2FzdChvLkRZTkFNSUNfVFlQRSkubm90SWRlbnRpY2FsKG8ubGl0ZXJhbChmYWxzZSkpKVxuICAgICAgICAgICAgICAgIC50b0RlY2xTdG10KG51bGwsIFtvLlN0bXRNb2RpZmllci5GaW5hbF0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9tZXRob2QuYWRkU3RtdHMoYWN0aW9uU3RtdHMpO1xuICB9XG5cbiAgZmluaXNoTWV0aG9kKCkge1xuICAgIHZhciBtYXJrUGF0aFRvUm9vdFN0YXJ0ID0gdGhpcy5faGFzQ29tcG9uZW50SG9zdExpc3RlbmVyID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVFbGVtZW50LmFwcEVsZW1lbnQucHJvcCgnY29tcG9uZW50VmlldycpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLlRISVNfRVhQUjtcbiAgICB2YXIgcmVzdWx0RXhwcjogby5FeHByZXNzaW9uID0gby5saXRlcmFsKHRydWUpO1xuICAgIHRoaXMuX2FjdGlvblJlc3VsdEV4cHJzLmZvckVhY2goKGV4cHIpID0+IHsgcmVzdWx0RXhwciA9IHJlc3VsdEV4cHIuYW5kKGV4cHIpOyB9KTtcbiAgICB2YXIgc3RtdHMgPVxuICAgICAgICAoPG8uU3RhdGVtZW50W10+W21hcmtQYXRoVG9Sb290U3RhcnQuY2FsbE1ldGhvZCgnbWFya1BhdGhUb1Jvb3RBc0NoZWNrT25jZScsIFtdKS50b1N0bXQoKV0pXG4gICAgICAgICAgICAuY29uY2F0KHRoaXMuX21ldGhvZC5maW5pc2goKSlcbiAgICAgICAgICAgIC5jb25jYXQoW25ldyBvLlJldHVyblN0YXRlbWVudChyZXN1bHRFeHByKV0pO1xuICAgIC8vIHByaXZhdGUgaXMgZmluZSBoZXJlIGFzIG5vIGNoaWxkIHZpZXcgd2lsbCByZWZlcmVuY2UgdGhlIGV2ZW50IGhhbmRsZXIuLi5cbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuZXZlbnRIYW5kbGVyTWV0aG9kcy5wdXNoKG5ldyBvLkNsYXNzTWV0aG9kKFxuICAgICAgICB0aGlzLl9tZXRob2ROYW1lLCBbdGhpcy5fZXZlbnRQYXJhbV0sIHN0bXRzLCBvLkJPT0xfVFlQRSwgW28uU3RtdE1vZGlmaWVyLlByaXZhdGVdKSk7XG4gIH1cblxuICBsaXN0ZW5Ub1JlbmRlcmVyKCkge1xuICAgIHZhciBsaXN0ZW5FeHByO1xuICAgIHZhciBldmVudExpc3RlbmVyID0gby5USElTX0VYUFIuY2FsbE1ldGhvZChcbiAgICAgICAgJ2V2ZW50SGFuZGxlcicsXG4gICAgICAgIFtvLlRISVNfRVhQUi5wcm9wKHRoaXMuX21ldGhvZE5hbWUpLmNhbGxNZXRob2Qoby5CdWlsdGluTWV0aG9kLmJpbmQsIFtvLlRISVNfRVhQUl0pXSk7XG4gICAgaWYgKGlzUHJlc2VudCh0aGlzLmV2ZW50VGFyZ2V0KSkge1xuICAgICAgbGlzdGVuRXhwciA9IFZpZXdQcm9wZXJ0aWVzLnJlbmRlcmVyLmNhbGxNZXRob2QoXG4gICAgICAgICAgJ2xpc3Rlbkdsb2JhbCcsIFtvLmxpdGVyYWwodGhpcy5ldmVudFRhcmdldCksIG8ubGl0ZXJhbCh0aGlzLmV2ZW50TmFtZSksIGV2ZW50TGlzdGVuZXJdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdGVuRXhwciA9IFZpZXdQcm9wZXJ0aWVzLnJlbmRlcmVyLmNhbGxNZXRob2QoXG4gICAgICAgICAgJ2xpc3RlbicsIFt0aGlzLmNvbXBpbGVFbGVtZW50LnJlbmRlck5vZGUsIG8ubGl0ZXJhbCh0aGlzLmV2ZW50TmFtZSksIGV2ZW50TGlzdGVuZXJdKTtcbiAgICB9XG4gICAgdmFyIGRpc3Bvc2FibGUgPSBvLnZhcmlhYmxlKGBkaXNwb3NhYmxlXyR7dGhpcy5jb21waWxlRWxlbWVudC52aWV3LmRpc3Bvc2FibGVzLmxlbmd0aH1gKTtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuZGlzcG9zYWJsZXMucHVzaChkaXNwb3NhYmxlKTtcbiAgICAvLyBwcml2YXRlIGlzIGZpbmUgaGVyZSBhcyBubyBjaGlsZCB2aWV3IHdpbGwgcmVmZXJlbmNlIHRoZSBldmVudCBoYW5kbGVyLi4uXG4gICAgdGhpcy5jb21waWxlRWxlbWVudC52aWV3LmNyZWF0ZU1ldGhvZC5hZGRTdG10KFxuICAgICAgICBkaXNwb3NhYmxlLnNldChsaXN0ZW5FeHByKS50b0RlY2xTdG10KG8uRlVOQ1RJT05fVFlQRSwgW28uU3RtdE1vZGlmaWVyLlByaXZhdGVdKSk7XG4gIH1cblxuICBsaXN0ZW5Ub0RpcmVjdGl2ZShkaXJlY3RpdmVJbnN0YW5jZTogby5FeHByZXNzaW9uLCBvYnNlcnZhYmxlUHJvcE5hbWU6IHN0cmluZykge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBvLnZhcmlhYmxlKGBzdWJzY3JpcHRpb25fJHt0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuc3Vic2NyaXB0aW9ucy5sZW5ndGh9YCk7XG4gICAgdGhpcy5jb21waWxlRWxlbWVudC52aWV3LnN1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xuICAgIHZhciBldmVudExpc3RlbmVyID0gby5USElTX0VYUFIuY2FsbE1ldGhvZChcbiAgICAgICAgJ2V2ZW50SGFuZGxlcicsXG4gICAgICAgIFtvLlRISVNfRVhQUi5wcm9wKHRoaXMuX21ldGhvZE5hbWUpLmNhbGxNZXRob2Qoby5CdWlsdGluTWV0aG9kLmJpbmQsIFtvLlRISVNfRVhQUl0pXSk7XG4gICAgdGhpcy5jb21waWxlRWxlbWVudC52aWV3LmNyZWF0ZU1ldGhvZC5hZGRTdG10KFxuICAgICAgICBzdWJzY3JpcHRpb24uc2V0KGRpcmVjdGl2ZUluc3RhbmNlLnByb3Aob2JzZXJ2YWJsZVByb3BOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2FsbE1ldGhvZChvLkJ1aWx0aW5NZXRob2QuU3Vic2NyaWJlT2JzZXJ2YWJsZSwgW2V2ZW50TGlzdGVuZXJdKSlcbiAgICAgICAgICAgIC50b0RlY2xTdG10KG51bGwsIFtvLlN0bXRNb2RpZmllci5GaW5hbF0pKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29sbGVjdEV2ZW50TGlzdGVuZXJzKGhvc3RFdmVudHM6IEJvdW5kRXZlbnRBc3RbXSwgZGlyczogRGlyZWN0aXZlQXN0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVFbGVtZW50OiBDb21waWxlRWxlbWVudCk6IENvbXBpbGVFdmVudExpc3RlbmVyW10ge1xuICB2YXIgZXZlbnRMaXN0ZW5lcnM6IENvbXBpbGVFdmVudExpc3RlbmVyW10gPSBbXTtcbiAgaG9zdEV2ZW50cy5mb3JFYWNoKChob3N0RXZlbnQpID0+IHtcbiAgICBjb21waWxlRWxlbWVudC52aWV3LmJpbmRpbmdzLnB1c2gobmV3IENvbXBpbGVCaW5kaW5nKGNvbXBpbGVFbGVtZW50LCBob3N0RXZlbnQpKTtcbiAgICB2YXIgbGlzdGVuZXIgPSBDb21waWxlRXZlbnRMaXN0ZW5lci5nZXRPckNyZWF0ZShjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50LnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0RXZlbnQubmFtZSwgZXZlbnRMaXN0ZW5lcnMpO1xuICAgIGxpc3RlbmVyLmFkZEFjdGlvbihob3N0RXZlbnQsIG51bGwsIG51bGwpO1xuICB9KTtcbiAgTGlzdFdyYXBwZXIuZm9yRWFjaFdpdGhJbmRleChkaXJzLCAoZGlyZWN0aXZlQXN0LCBpKSA9PiB7XG4gICAgdmFyIGRpcmVjdGl2ZUluc3RhbmNlID0gY29tcGlsZUVsZW1lbnQuZGlyZWN0aXZlSW5zdGFuY2VzW2ldO1xuICAgIGRpcmVjdGl2ZUFzdC5ob3N0RXZlbnRzLmZvckVhY2goKGhvc3RFdmVudCkgPT4ge1xuICAgICAgY29tcGlsZUVsZW1lbnQudmlldy5iaW5kaW5ncy5wdXNoKG5ldyBDb21waWxlQmluZGluZyhjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50KSk7XG4gICAgICB2YXIgbGlzdGVuZXIgPSBDb21waWxlRXZlbnRMaXN0ZW5lci5nZXRPckNyZWF0ZShjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50LnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RFdmVudC5uYW1lLCBldmVudExpc3RlbmVycyk7XG4gICAgICBsaXN0ZW5lci5hZGRBY3Rpb24oaG9zdEV2ZW50LCBkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLCBkaXJlY3RpdmVJbnN0YW5jZSk7XG4gICAgfSk7XG4gIH0pO1xuICBldmVudExpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4gbGlzdGVuZXIuZmluaXNoTWV0aG9kKCkpO1xuICByZXR1cm4gZXZlbnRMaXN0ZW5lcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kRGlyZWN0aXZlT3V0cHV0cyhkaXJlY3RpdmVBc3Q6IERpcmVjdGl2ZUFzdCwgZGlyZWN0aXZlSW5zdGFuY2U6IG8uRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudExpc3RlbmVyczogQ29tcGlsZUV2ZW50TGlzdGVuZXJbXSkge1xuICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2goZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS5vdXRwdXRzLCAoZXZlbnROYW1lLCBvYnNlcnZhYmxlUHJvcE5hbWUpID0+IHtcbiAgICBldmVudExpc3RlbmVycy5maWx0ZXIobGlzdGVuZXIgPT4gbGlzdGVuZXIuZXZlbnROYW1lID09IGV2ZW50TmFtZSlcbiAgICAgICAgLmZvckVhY2goXG4gICAgICAgICAgICAobGlzdGVuZXIpID0+IHsgbGlzdGVuZXIubGlzdGVuVG9EaXJlY3RpdmUoZGlyZWN0aXZlSW5zdGFuY2UsIG9ic2VydmFibGVQcm9wTmFtZSk7IH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRSZW5kZXJPdXRwdXRzKGV2ZW50TGlzdGVuZXJzOiBDb21waWxlRXZlbnRMaXN0ZW5lcltdKSB7XG4gIGV2ZW50TGlzdGVuZXJzLmZvckVhY2gobGlzdGVuZXIgPT4gbGlzdGVuZXIubGlzdGVuVG9SZW5kZXJlcigpKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFN0bXRJbnRvRXhwcmVzc2lvbihzdG10OiBvLlN0YXRlbWVudCk6IG8uRXhwcmVzc2lvbiB7XG4gIGlmIChzdG10IGluc3RhbmNlb2Ygby5FeHByZXNzaW9uU3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHN0bXQuZXhwcjtcbiAgfSBlbHNlIGlmIChzdG10IGluc3RhbmNlb2Ygby5SZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gc3RtdC52YWx1ZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FudGl0aXplRXZlbnROYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBTdHJpbmdXcmFwcGVyLnJlcGxhY2VBbGwobmFtZSwgL1teYS16QS1aX10vZywgJ18nKTtcbn1cbiJdfQ==