import { provide, ReflectiveInjector } from 'angular2/core';
import { isBlank, isPresent } from 'angular2/src/facade/lang';
import { ListWrapper } from 'angular2/src/facade/collection';
import { EventEmitter, PromiseWrapper, ObservableWrapper } from 'angular2/src/facade/async';
import { StringMapWrapper } from 'angular2/src/facade/collection';
import { BaseException } from 'angular2/src/facade/exceptions';
import { recognize } from './recognize';
import { link } from './link';
import { equalSegments, routeSegmentComponentFactory, RouteSegment, rootNode } from './segments';
import { hasLifecycleHook } from './lifecycle_reflector';
import { DEFAULT_OUTLET_NAME } from './constants';
export class RouterOutletMap {
    constructor() {
        /** @internal */
        this._outlets = {};
    }
    registerOutlet(name, outlet) { this._outlets[name] = outlet; }
}
export class Router {
    constructor(_rootComponent, _rootComponentType, _componentResolver, _urlSerializer, _routerOutletMap, _location) {
        this._rootComponent = _rootComponent;
        this._rootComponentType = _rootComponentType;
        this._componentResolver = _componentResolver;
        this._urlSerializer = _urlSerializer;
        this._routerOutletMap = _routerOutletMap;
        this._location = _location;
        this._changes = new EventEmitter();
        this._setUpLocationChangeListener();
        this.navigateByUrl(this._location.path());
    }
    get urlTree() { return this._urlTree; }
    navigateByUrl(url) {
        return this._navigate(this._urlSerializer.parse(url));
    }
    navigate(changes, segment) {
        return this._navigate(this.createUrlTree(changes, segment));
    }
    dispose() { ObservableWrapper.dispose(this._locationSubscription); }
    _setUpLocationChangeListener() {
        this._locationSubscription = this._location.subscribe((change) => { this._navigate(this._urlSerializer.parse(change['url'])); });
    }
    _navigate(url) {
        this._urlTree = url;
        return recognize(this._componentResolver, this._rootComponentType, url)
            .then(currTree => {
            return new _LoadSegments(currTree, this._prevTree)
                .load(this._routerOutletMap, this._rootComponent)
                .then(updated => {
                if (updated) {
                    this._prevTree = currTree;
                    this._location.go(this._urlSerializer.serialize(this._urlTree));
                    this._changes.emit(null);
                }
            });
        });
    }
    createUrlTree(changes, segment) {
        if (isPresent(this._prevTree)) {
            let s = isPresent(segment) ? segment : this._prevTree.root;
            return link(s, this._prevTree, this.urlTree, changes);
        }
        else {
            return null;
        }
    }
    serializeUrl(url) { return this._urlSerializer.serialize(url); }
    get changes() { return this._changes; }
    get routeTree() { return this._prevTree; }
}
class _LoadSegments {
    constructor(currTree, prevTree) {
        this.currTree = currTree;
        this.prevTree = prevTree;
        this.deactivations = [];
        this.performMutation = true;
    }
    load(parentOutletMap, rootComponent) {
        let prevRoot = isPresent(this.prevTree) ? rootNode(this.prevTree) : null;
        let currRoot = rootNode(this.currTree);
        return this.canDeactivate(currRoot, prevRoot, parentOutletMap, rootComponent)
            .then(res => {
            this.performMutation = true;
            if (res) {
                this.loadChildSegments(currRoot, prevRoot, parentOutletMap, [rootComponent]);
            }
            return res;
        });
    }
    canDeactivate(currRoot, prevRoot, outletMap, rootComponent) {
        this.performMutation = false;
        this.loadChildSegments(currRoot, prevRoot, outletMap, [rootComponent]);
        let allPaths = PromiseWrapper.all(this.deactivations.map(r => this.checkCanDeactivatePath(r)));
        return allPaths.then((values) => values.filter(v => v).length === values.length);
    }
    checkCanDeactivatePath(path) {
        let curr = PromiseWrapper.resolve(true);
        for (let p of ListWrapper.reversed(path)) {
            curr = curr.then(_ => {
                if (hasLifecycleHook("routerCanDeactivate", p)) {
                    return p.routerCanDeactivate(this.prevTree, this.currTree);
                }
                else {
                    return _;
                }
            });
        }
        return curr;
    }
    loadChildSegments(currNode, prevNode, outletMap, components) {
        let prevChildren = isPresent(prevNode) ?
            prevNode.children.reduce((m, c) => {
                m[c.value.outlet] = c;
                return m;
            }, {}) :
            {};
        currNode.children.forEach(c => {
            this.loadSegments(c, prevChildren[c.value.outlet], outletMap, components);
            StringMapWrapper.delete(prevChildren, c.value.outlet);
        });
        StringMapWrapper.forEach(prevChildren, (v, k) => this.unloadOutlet(outletMap._outlets[k], components));
    }
    loadSegments(currNode, prevNode, parentOutletMap, components) {
        let curr = currNode.value;
        let prev = isPresent(prevNode) ? prevNode.value : null;
        let outlet = this.getOutlet(parentOutletMap, currNode.value);
        if (equalSegments(curr, prev)) {
            this.loadChildSegments(currNode, prevNode, outlet.outletMap, components.concat([outlet.loadedComponent]));
        }
        else {
            this.unloadOutlet(outlet, components);
            if (this.performMutation) {
                let outletMap = new RouterOutletMap();
                let loadedComponent = this.loadNewSegment(outletMap, curr, prev, outlet);
                this.loadChildSegments(currNode, prevNode, outletMap, components.concat([loadedComponent]));
            }
        }
    }
    loadNewSegment(outletMap, curr, prev, outlet) {
        let resolved = ReflectiveInjector.resolve([provide(RouterOutletMap, { useValue: outletMap }), provide(RouteSegment, { useValue: curr })]);
        let ref = outlet.load(routeSegmentComponentFactory(curr), resolved, outletMap);
        if (hasLifecycleHook("routerOnActivate", ref.instance)) {
            ref.instance.routerOnActivate(curr, prev, this.currTree, this.prevTree);
        }
        return ref.instance;
    }
    getOutlet(outletMap, segment) {
        let outlet = outletMap._outlets[segment.outlet];
        if (isBlank(outlet)) {
            if (segment.outlet == DEFAULT_OUTLET_NAME) {
                throw new BaseException(`Cannot find default outlet`);
            }
            else {
                throw new BaseException(`Cannot find the outlet ${segment.outlet}`);
            }
        }
        return outlet;
    }
    unloadOutlet(outlet, components) {
        if (isPresent(outlet) && outlet.isLoaded) {
            StringMapWrapper.forEach(outlet.outletMap._outlets, (v, k) => this.unloadOutlet(v, components));
            if (this.performMutation) {
                outlet.unload();
            }
            else {
                this.deactivations.push(components.concat([outlet.loadedComponent]));
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1HdjFSM0ZWai50bXAvYW5ndWxhcjIvc3JjL2FsdF9yb3V0ZXIvcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQVMsT0FBTyxFQUFFLGtCQUFrQixFQUFvQixNQUFNLGVBQWU7T0FFN0UsRUFBTyxPQUFPLEVBQUUsU0FBUyxFQUFDLE1BQU0sMEJBQTBCO09BQzFELEVBQUMsV0FBVyxFQUFDLE1BQU0sZ0NBQWdDO09BQ25ELEVBQ0wsWUFBWSxFQUVaLGNBQWMsRUFDZCxpQkFBaUIsRUFDbEIsTUFBTSwyQkFBMkI7T0FDM0IsRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGdDQUFnQztPQUN4RCxFQUFDLGFBQWEsRUFBQyxNQUFNLGdDQUFnQztPQUdyRCxFQUFDLFNBQVMsRUFBQyxNQUFNLGFBQWE7T0FFOUIsRUFBQyxJQUFJLEVBQUMsTUFBTSxRQUFRO09BRXBCLEVBQ0wsYUFBYSxFQUNiLDRCQUE0QixFQUM1QixZQUFZLEVBRVosUUFBUSxFQUlULE1BQU0sWUFBWTtPQUNaLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSx1QkFBdUI7T0FDL0MsRUFBQyxtQkFBbUIsRUFBQyxNQUFNLGFBQWE7QUFFL0M7SUFBQTtRQUNFLGdCQUFnQjtRQUNoQixhQUFRLEdBQW1DLEVBQUUsQ0FBQztJQUVoRCxDQUFDO0lBREMsY0FBYyxDQUFDLElBQVksRUFBRSxNQUFvQixJQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM1RixDQUFDO0FBRUQ7SUFNRSxZQUFvQixjQUFzQixFQUFVLGtCQUF3QixFQUN4RCxrQkFBcUMsRUFDckMsY0FBbUMsRUFDbkMsZ0JBQWlDLEVBQVUsU0FBbUI7UUFIOUQsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtC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QyxZQUFZLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDckUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkUsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPbkluaXQsIHByb3ZpZGUsIFJlZmxlY3RpdmVJbmplY3RvciwgQ29tcG9uZW50UmVzb2x2ZXJ9IGZyb20gJ2FuZ3VsYXIyL2NvcmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7VHlwZSwgaXNCbGFuaywgaXNQcmVzZW50fSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtMaXN0V3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9jb2xsZWN0aW9uJztcbmltcG9ydCB7XG4gIEV2ZW50RW1pdHRlcixcbiAgT2JzZXJ2YWJsZSxcbiAgUHJvbWlzZVdyYXBwZXIsXG4gIE9ic2VydmFibGVXcmFwcGVyXG59IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvYXN5bmMnO1xuaW1wb3J0IHtTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtCYXNlRXhjZXB0aW9ufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2V4Y2VwdGlvbnMnO1xuaW1wb3J0IHtSb3V0ZXJVcmxTZXJpYWxpemVyfSBmcm9tICcuL3JvdXRlcl91cmxfc2VyaWFsaXplcic7XG5pbXBvcnQge0NhbkRlYWN0aXZhdGV9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge3JlY29nbml6ZX0gZnJvbSAnLi9yZWNvZ25pemUnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnYW5ndWxhcjIvcGxhdGZvcm0vY29tbW9uJztcbmltcG9ydCB7bGlua30gZnJvbSAnLi9saW5rJztcblxuaW1wb3J0IHtcbiAgZXF1YWxTZWdtZW50cyxcbiAgcm91dGVTZWdtZW50Q29tcG9uZW50RmFjdG9yeSxcbiAgUm91dGVTZWdtZW50LFxuICBUcmVlLFxuICByb290Tm9kZSxcbiAgVHJlZU5vZGUsXG4gIFVybFNlZ21lbnQsXG4gIHNlcmlhbGl6ZVJvdXRlU2VnbWVudFRyZWVcbn0gZnJvbSAnLi9zZWdtZW50cyc7XG5pbXBvcnQge2hhc0xpZmVjeWNsZUhvb2t9IGZyb20gJy4vbGlmZWN5Y2xlX3JlZmxlY3Rvcic7XG5pbXBvcnQge0RFRkFVTFRfT1VUTEVUX05BTUV9IGZyb20gJy4vY29uc3RhbnRzJztcblxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldE1hcCB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX291dGxldHM6IHtbbmFtZTogc3RyaW5nXTogUm91dGVyT3V0bGV0fSA9IHt9O1xuICByZWdpc3Rlck91dGxldChuYW1lOiBzdHJpbmcsIG91dGxldDogUm91dGVyT3V0bGV0KTogdm9pZCB7IHRoaXMuX291dGxldHNbbmFtZV0gPSBvdXRsZXQ7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgX3ByZXZUcmVlOiBUcmVlPFJvdXRlU2VnbWVudD47XG4gIHByaXZhdGUgX3VybFRyZWU6IFRyZWU8VXJsU2VnbWVudD47XG4gIHByaXZhdGUgX2xvY2F0aW9uU3Vic2NyaXB0aW9uOiBhbnk7XG4gIHByaXZhdGUgX2NoYW5nZXM6IEV2ZW50RW1pdHRlcjx2b2lkPiA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9yb290Q29tcG9uZW50OiBPYmplY3QsIHByaXZhdGUgX3Jvb3RDb21wb25lbnRUeXBlOiBUeXBlLFxuICAgICAgICAgICAgICBwcml2YXRlIF9jb21wb25lbnRSZXNvbHZlcjogQ29tcG9uZW50UmVzb2x2ZXIsXG4gICAgICAgICAgICAgIHByaXZhdGUgX3VybFNlcmlhbGl6ZXI6IFJvdXRlclVybFNlcmlhbGl6ZXIsXG4gICAgICAgICAgICAgIHByaXZhdGUgX3JvdXRlck91dGxldE1hcDogUm91dGVyT3V0bGV0TWFwLCBwcml2YXRlIF9sb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICB0aGlzLl9zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5fbG9jYXRpb24ucGF0aCgpKTtcbiAgfVxuXG4gIGdldCB1cmxUcmVlKCk6IFRyZWU8VXJsU2VnbWVudD4geyByZXR1cm4gdGhpcy5fdXJsVHJlZTsgfVxuXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5fbmF2aWdhdGUodGhpcy5fdXJsU2VyaWFsaXplci5wYXJzZSh1cmwpKTtcbiAgfVxuXG4gIG5hdmlnYXRlKGNoYW5nZXM6IGFueVtdLCBzZWdtZW50PzogUm91dGVTZWdtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX25hdmlnYXRlKHRoaXMuY3JlYXRlVXJsVHJlZShjaGFuZ2VzLCBzZWdtZW50KSk7XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQgeyBPYnNlcnZhYmxlV3JhcHBlci5kaXNwb3NlKHRoaXMuX2xvY2F0aW9uU3Vic2NyaXB0aW9uKTsgfVxuXG4gIHByaXZhdGUgX3NldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICB0aGlzLl9sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHRoaXMuX2xvY2F0aW9uLnN1YnNjcmliZShcbiAgICAgICAgKGNoYW5nZSkgPT4geyB0aGlzLl9uYXZpZ2F0ZSh0aGlzLl91cmxTZXJpYWxpemVyLnBhcnNlKGNoYW5nZVsndXJsJ10pKTsgfSk7XG4gIH1cblxuICBwcml2YXRlIF9uYXZpZ2F0ZSh1cmw6IFRyZWU8VXJsU2VnbWVudD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLl91cmxUcmVlID0gdXJsO1xuICAgIHJldHVybiByZWNvZ25pemUodGhpcy5fY29tcG9uZW50UmVzb2x2ZXIsIHRoaXMuX3Jvb3RDb21wb25lbnRUeXBlLCB1cmwpXG4gICAgICAgIC50aGVuKGN1cnJUcmVlID0+IHtcbiAgICAgICAgICByZXR1cm4gbmV3IF9Mb2FkU2VnbWVudHMoY3VyclRyZWUsIHRoaXMuX3ByZXZUcmVlKVxuICAgICAgICAgICAgICAubG9hZCh0aGlzLl9yb3V0ZXJPdXRsZXRNYXAsIHRoaXMuX3Jvb3RDb21wb25lbnQpXG4gICAgICAgICAgICAgIC50aGVuKHVwZGF0ZWQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVkKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2VHJlZSA9IGN1cnJUcmVlO1xuICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYXRpb24uZ28odGhpcy5fdXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5fdXJsVHJlZSkpO1xuICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlcy5lbWl0KG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlVXJsVHJlZShjaGFuZ2VzOiBhbnlbXSwgc2VnbWVudD86IFJvdXRlU2VnbWVudCk6IFRyZWU8VXJsU2VnbWVudD4ge1xuICAgIGlmIChpc1ByZXNlbnQodGhpcy5fcHJldlRyZWUpKSB7XG4gICAgICBsZXQgcyA9IGlzUHJlc2VudChzZWdtZW50KSA/IHNlZ21lbnQgOiB0aGlzLl9wcmV2VHJlZS5yb290O1xuICAgICAgcmV0dXJuIGxpbmsocywgdGhpcy5fcHJldlRyZWUsIHRoaXMudXJsVHJlZSwgY2hhbmdlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFRyZWU8VXJsU2VnbWVudD4pOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fdXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTsgfVxuXG4gIGdldCBjaGFuZ2VzKCk6IE9ic2VydmFibGU8dm9pZD4geyByZXR1cm4gdGhpcy5fY2hhbmdlczsgfVxuXG4gIGdldCByb3V0ZVRyZWUoKTogVHJlZTxSb3V0ZVNlZ21lbnQ+IHsgcmV0dXJuIHRoaXMuX3ByZXZUcmVlOyB9XG59XG5cblxuY2xhc3MgX0xvYWRTZWdtZW50cyB7XG4gIHByaXZhdGUgZGVhY3RpdmF0aW9uczogT2JqZWN0W11bXSA9IFtdO1xuICBwcml2YXRlIHBlcmZvcm1NdXRhdGlvbjogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjdXJyVHJlZTogVHJlZTxSb3V0ZVNlZ21lbnQ+LCBwcml2YXRlIHByZXZUcmVlOiBUcmVlPFJvdXRlU2VnbWVudD4pIHt9XG5cbiAgbG9hZChwYXJlbnRPdXRsZXRNYXA6IFJvdXRlck91dGxldE1hcCwgcm9vdENvbXBvbmVudDogT2JqZWN0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgbGV0IHByZXZSb290ID0gaXNQcmVzZW50KHRoaXMucHJldlRyZWUpID8gcm9vdE5vZGUodGhpcy5wcmV2VHJlZSkgOiBudWxsO1xuICAgIGxldCBjdXJyUm9vdCA9IHJvb3ROb2RlKHRoaXMuY3VyclRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuY2FuRGVhY3RpdmF0ZShjdXJyUm9vdCwgcHJldlJvb3QsIHBhcmVudE91dGxldE1hcCwgcm9vdENvbXBvbmVudClcbiAgICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgICB0aGlzLnBlcmZvcm1NdXRhdGlvbiA9IHRydWU7XG4gICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgdGhpcy5sb2FkQ2hpbGRTZWdtZW50cyhjdXJyUm9vdCwgcHJldlJvb3QsIHBhcmVudE91dGxldE1hcCwgW3Jvb3RDb21wb25lbnRdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNhbkRlYWN0aXZhdGUoY3VyclJvb3Q6IFRyZWVOb2RlPFJvdXRlU2VnbWVudD4sIHByZXZSb290OiBUcmVlTm9kZTxSb3V0ZVNlZ21lbnQ+LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXAsIHJvb3RDb21wb25lbnQ6IE9iamVjdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRoaXMucGVyZm9ybU11dGF0aW9uID0gZmFsc2U7XG4gICAgdGhpcy5sb2FkQ2hpbGRTZWdtZW50cyhjdXJyUm9vdCwgcHJldlJvb3QsIG91dGxldE1hcCwgW3Jvb3RDb21wb25lbnRdKTtcblxuICAgIGxldCBhbGxQYXRocyA9IFByb21pc2VXcmFwcGVyLmFsbCh0aGlzLmRlYWN0aXZhdGlvbnMubWFwKHIgPT4gdGhpcy5jaGVja0NhbkRlYWN0aXZhdGVQYXRoKHIpKSk7XG4gICAgcmV0dXJuIGFsbFBhdGhzLnRoZW4oKHZhbHVlczogYm9vbGVhbltdKSA9PiB2YWx1ZXMuZmlsdGVyKHYgPT4gdikubGVuZ3RoID09PSB2YWx1ZXMubGVuZ3RoKTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDYW5EZWFjdGl2YXRlUGF0aChwYXRoOiBPYmplY3RbXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGxldCBjdXJyID0gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZSh0cnVlKTtcbiAgICBmb3IgKGxldCBwIG9mIExpc3RXcmFwcGVyLnJldmVyc2VkKHBhdGgpKSB7XG4gICAgICBjdXJyID0gY3Vyci50aGVuKF8gPT4ge1xuICAgICAgICBpZiAoaGFzTGlmZWN5Y2xlSG9vayhcInJvdXRlckNhbkRlYWN0aXZhdGVcIiwgcCkpIHtcbiAgICAgICAgICByZXR1cm4gKDxDYW5EZWFjdGl2YXRlPnApLnJvdXRlckNhbkRlYWN0aXZhdGUodGhpcy5wcmV2VHJlZSwgdGhpcy5jdXJyVHJlZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIF87XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gY3VycjtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZENoaWxkU2VnbWVudHMoY3Vyck5vZGU6IFRyZWVOb2RlPFJvdXRlU2VnbWVudD4sIHByZXZOb2RlOiBUcmVlTm9kZTxSb3V0ZVNlZ21lbnQ+LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dGxldE1hcDogUm91dGVyT3V0bGV0TWFwLCBjb21wb25lbnRzOiBPYmplY3RbXSk6IHZvaWQge1xuICAgIGxldCBwcmV2Q2hpbGRyZW4gPSBpc1ByZXNlbnQocHJldk5vZGUpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZOb2RlLmNoaWxkcmVuLnJlZHVjZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobSwgYykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbVtjLnZhbHVlLm91dGxldF0gPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7fSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAge307XG5cbiAgICBjdXJyTm9kZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4ge1xuICAgICAgdGhpcy5sb2FkU2VnbWVudHMoYywgcHJldkNoaWxkcmVuW2MudmFsdWUub3V0bGV0XSwgb3V0bGV0TWFwLCBjb21wb25lbnRzKTtcbiAgICAgIFN0cmluZ01hcFdyYXBwZXIuZGVsZXRlKHByZXZDaGlsZHJlbiwgYy52YWx1ZS5vdXRsZXQpO1xuICAgIH0pO1xuXG4gICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKHByZXZDaGlsZHJlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHYsIGspID0+IHRoaXMudW5sb2FkT3V0bGV0KG91dGxldE1hcC5fb3V0bGV0c1trXSwgY29tcG9uZW50cykpO1xuICB9XG5cbiAgbG9hZFNlZ21lbnRzKGN1cnJOb2RlOiBUcmVlTm9kZTxSb3V0ZVNlZ21lbnQ+LCBwcmV2Tm9kZTogVHJlZU5vZGU8Um91dGVTZWdtZW50PixcbiAgICAgICAgICAgICAgIHBhcmVudE91dGxldE1hcDogUm91dGVyT3V0bGV0TWFwLCBjb21wb25lbnRzOiBPYmplY3RbXSk6IHZvaWQge1xuICAgIGxldCBjdXJyID0gY3Vyck5vZGUudmFsdWU7XG4gICAgbGV0IHByZXYgPSBpc1ByZXNlbnQocHJldk5vZGUpID8gcHJldk5vZGUudmFsdWUgOiBudWxsO1xuICAgIGxldCBvdXRsZXQgPSB0aGlzLmdldE91dGxldChwYXJlbnRPdXRsZXRNYXAsIGN1cnJOb2RlLnZhbHVlKTtcblxuICAgIGlmIChlcXVhbFNlZ21lbnRzKGN1cnIsIHByZXYpKSB7XG4gICAgICB0aGlzLmxvYWRDaGlsZFNlZ21lbnRzKGN1cnJOb2RlLCBwcmV2Tm9kZSwgb3V0bGV0Lm91dGxldE1hcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5jb25jYXQoW291dGxldC5sb2FkZWRDb21wb25lbnRdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudW5sb2FkT3V0bGV0KG91dGxldCwgY29tcG9uZW50cyk7XG4gICAgICBpZiAodGhpcy5wZXJmb3JtTXV0YXRpb24pIHtcbiAgICAgICAgbGV0IG91dGxldE1hcCA9IG5ldyBSb3V0ZXJPdXRsZXRNYXAoKTtcbiAgICAgICAgbGV0IGxvYWRlZENvbXBvbmVudCA9IHRoaXMubG9hZE5ld1NlZ21lbnQob3V0bGV0TWFwLCBjdXJyLCBwcmV2LCBvdXRsZXQpO1xuICAgICAgICB0aGlzLmxvYWRDaGlsZFNlZ21lbnRzKGN1cnJOb2RlLCBwcmV2Tm9kZSwgb3V0bGV0TWFwLCBjb21wb25lbnRzLmNvbmNhdChbbG9hZGVkQ29tcG9uZW50XSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZE5ld1NlZ21lbnQob3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXAsIGN1cnI6IFJvdXRlU2VnbWVudCwgcHJldjogUm91dGVTZWdtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgIG91dGxldDogUm91dGVyT3V0bGV0KTogT2JqZWN0IHtcbiAgICBsZXQgcmVzb2x2ZWQgPSBSZWZsZWN0aXZlSW5qZWN0b3IucmVzb2x2ZShcbiAgICAgICAgW3Byb3ZpZGUoUm91dGVyT3V0bGV0TWFwLCB7dXNlVmFsdWU6IG91dGxldE1hcH0pLCBwcm92aWRlKFJvdXRlU2VnbWVudCwge3VzZVZhbHVlOiBjdXJyfSldKTtcbiAgICBsZXQgcmVmID0gb3V0bGV0LmxvYWQocm91dGVTZWdtZW50Q29tcG9uZW50RmFjdG9yeShjdXJyKSwgcmVzb2x2ZWQsIG91dGxldE1hcCk7XG4gICAgaWYgKGhhc0xpZmVjeWNsZUhvb2soXCJyb3V0ZXJPbkFjdGl2YXRlXCIsIHJlZi5pbnN0YW5jZSkpIHtcbiAgICAgIHJlZi5pbnN0YW5jZS5yb3V0ZXJPbkFjdGl2YXRlKGN1cnIsIHByZXYsIHRoaXMuY3VyclRyZWUsIHRoaXMucHJldlRyZWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVmLmluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPdXRsZXQob3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXAsIHNlZ21lbnQ6IFJvdXRlU2VnbWVudCk6IFJvdXRlck91dGxldCB7XG4gICAgbGV0IG91dGxldCA9IG91dGxldE1hcC5fb3V0bGV0c1tzZWdtZW50Lm91dGxldF07XG4gICAgaWYgKGlzQmxhbmsob3V0bGV0KSkge1xuICAgICAgaWYgKHNlZ21lbnQub3V0bGV0ID09IERFRkFVTFRfT1VUTEVUX05BTUUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYENhbm5vdCBmaW5kIGRlZmF1bHQgb3V0bGV0YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihgQ2Fubm90IGZpbmQgdGhlIG91dGxldCAke3NlZ21lbnQub3V0bGV0fWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0bGV0O1xuICB9XG5cbiAgcHJpdmF0ZSB1bmxvYWRPdXRsZXQob3V0bGV0OiBSb3V0ZXJPdXRsZXQsIGNvbXBvbmVudHM6IE9iamVjdFtdKTogdm9pZCB7XG4gICAgaWYgKGlzUHJlc2VudChvdXRsZXQpICYmIG91dGxldC5pc0xvYWRlZCkge1xuICAgICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKG91dGxldC5vdXRsZXRNYXAuX291dGxldHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHYsIGspID0+IHRoaXMudW5sb2FkT3V0bGV0KHYsIGNvbXBvbmVudHMpKTtcbiAgICAgIGlmICh0aGlzLnBlcmZvcm1NdXRhdGlvbikge1xuICAgICAgICBvdXRsZXQudW5sb2FkKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGlvbnMucHVzaChjb21wb25lbnRzLmNvbmNhdChbb3V0bGV0LmxvYWRlZENvbXBvbmVudF0pKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iXX0=