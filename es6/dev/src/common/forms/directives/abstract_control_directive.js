import { isPresent } from 'angular2/src/facade/lang';
import { unimplemented } from 'angular2/src/facade/exceptions';
/**
 * Base class for control directives.
 *
 * Only used internally in the forms module.
 */
export class AbstractControlDirective {
    get control() { return unimplemented(); }
    get value() { return isPresent(this.control) ? this.control.value : null; }
    get valid() { return isPresent(this.control) ? this.control.valid : null; }
    get errors() {
        return isPresent(this.control) ? this.control.errors : null;
    }
    get pristine() { return isPresent(this.control) ? this.control.pristine : null; }
    get dirty() { return isPresent(this.control) ? this.control.dirty : null; }
    get touched() { return isPresent(this.control) ? this.control.touched : null; }
    get untouched() { return isPresent(this.control) ? this.control.untouched : null; }
    get path() { return null; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RfY29udHJvbF9kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLUd2MVIzRlZqLnRtcC9hbmd1bGFyMi9zcmMvY29tbW9uL2Zvcm1zL2RpcmVjdGl2ZXMvYWJzdHJhY3RfY29udHJvbF9kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ik9BQ08sRUFBQyxTQUFTLEVBQUMsTUFBTSwwQkFBMEI7T0FDM0MsRUFBQyxhQUFhLEVBQUMsTUFBTSxnQ0FBZ0M7QUFFNUQ7Ozs7R0FJRztBQUNIO0lBQ0UsSUFBSSxPQUFPLEtBQXNCLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFMUQsSUFBSSxLQUFLLEtBQVUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVoRixJQUFJLEtBQUssS0FBYyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXBGLElBQUksTUFBTTtRQUNSLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUM5RCxDQUFDO0lBRUQsSUFBSSxRQUFRLEtBQWMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUUxRixJQUFJLEtBQUssS0FBYyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXBGLElBQUksT0FBTyxLQUFjLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFeEYsSUFBSSxTQUFTLEtBQWMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUU1RixJQUFJLElBQUksS0FBZSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Fic3RyYWN0Q29udHJvbH0gZnJvbSAnLi4vbW9kZWwnO1xuaW1wb3J0IHtpc1ByZXNlbnR9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge3VuaW1wbGVtZW50ZWR9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgY29udHJvbCBkaXJlY3RpdmVzLlxuICpcbiAqIE9ubHkgdXNlZCBpbnRlcm5hbGx5IGluIHRoZSBmb3JtcyBtb2R1bGUuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBYnN0cmFjdENvbnRyb2xEaXJlY3RpdmUge1xuICBnZXQgY29udHJvbCgpOiBBYnN0cmFjdENvbnRyb2wgeyByZXR1cm4gdW5pbXBsZW1lbnRlZCgpOyB9XG5cbiAgZ2V0IHZhbHVlKCk6IGFueSB7IHJldHVybiBpc1ByZXNlbnQodGhpcy5jb250cm9sKSA/IHRoaXMuY29udHJvbC52YWx1ZSA6IG51bGw7IH1cblxuICBnZXQgdmFsaWQoKTogYm9vbGVhbiB7IHJldHVybiBpc1ByZXNlbnQodGhpcy5jb250cm9sKSA/IHRoaXMuY29udHJvbC52YWxpZCA6IG51bGw7IH1cblxuICBnZXQgZXJyb3JzKCk6IHtba2V5OiBzdHJpbmddOiBhbnl9IHtcbiAgICByZXR1cm4gaXNQcmVzZW50KHRoaXMuY29udHJvbCkgPyB0aGlzLmNvbnRyb2wuZXJyb3JzIDogbnVsbDtcbiAgfVxuXG4gIGdldCBwcmlzdGluZSgpOiBib29sZWFuIHsgcmV0dXJuIGlzUHJlc2VudCh0aGlzLmNvbnRyb2wpID8gdGhpcy5jb250cm9sLnByaXN0aW5lIDogbnVsbDsgfVxuXG4gIGdldCBkaXJ0eSgpOiBib29sZWFuIHsgcmV0dXJuIGlzUHJlc2VudCh0aGlzLmNvbnRyb2wpID8gdGhpcy5jb250cm9sLmRpcnR5IDogbnVsbDsgfVxuXG4gIGdldCB0b3VjaGVkKCk6IGJvb2xlYW4geyByZXR1cm4gaXNQcmVzZW50KHRoaXMuY29udHJvbCkgPyB0aGlzLmNvbnRyb2wudG91Y2hlZCA6IG51bGw7IH1cblxuICBnZXQgdW50b3VjaGVkKCk6IGJvb2xlYW4geyByZXR1cm4gaXNQcmVzZW50KHRoaXMuY29udHJvbCkgPyB0aGlzLmNvbnRyb2wudW50b3VjaGVkIDogbnVsbDsgfVxuXG4gIGdldCBwYXRoKCk6IHN0cmluZ1tdIHsgcmV0dXJuIG51bGw7IH1cbn1cbiJdfQ==