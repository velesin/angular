import { isString, Json } from 'angular2/src/facade/lang';
import { BaseException } from 'angular2/src/facade/exceptions';
import { isJsObject } from './http_utils';
/**
 * Creates `Response` instances from provided values.
 *
 * Though this object isn't
 * usually instantiated by end-users, it is the primary object interacted with when it comes time to
 * add data to a view.
 *
 * ### Example
 *
 * ```
 * http.request('my-friends.txt').subscribe(response => this.friends = response.text());
 * ```
 *
 * The Response's interface is inspired by the Response constructor defined in the [Fetch
 * Spec](https://fetch.spec.whatwg.org/#response-class), but is considered a static value whose body
 * can be accessed many times. There are other differences in the implementation, but this is the
 * most significant.
 */
export class Response {
    constructor(responseOptions) {
        this._body = responseOptions.body;
        this.status = responseOptions.status;
        this.ok = (this.status >= 200 && this.status <= 299);
        this.statusText = responseOptions.statusText;
        this.headers = responseOptions.headers;
        this.type = responseOptions.type;
        this.url = responseOptions.url;
    }
    /**
     * Not yet implemented
     */
    // TODO: Blob return type
    blob() { throw new BaseException('"blob()" method not implemented on Response superclass'); }
    /**
     * Attempts to return body as parsed `JSON` object, or raises an exception.
     */
    json() {
        var jsonResponse;
        if (isJsObject(this._body)) {
            jsonResponse = this._body;
        }
        else if (isString(this._body)) {
            jsonResponse = Json.parse(this._body);
        }
        return jsonResponse;
    }
    /**
     * Returns the body as a string, presuming `toString()` can be called on the response body.
     */
    text() { return this._body.toString(); }
    /**
     * Not yet implemented
     */
    // TODO: ArrayBuffer return type
    arrayBuffer() {
        throw new BaseException('"arrayBuffer()" method not implemented on Response superclass');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljX3Jlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1HdjFSM0ZWai50bXAvYW5ndWxhcjIvc3JjL2h0dHAvc3RhdGljX3Jlc3BvbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUNPLEVBQUMsUUFBUSxFQUFhLElBQUksRUFBQyxNQUFNLDBCQUEwQjtPQUMzRCxFQUFDLGFBQWEsRUFBbUIsTUFBTSxnQ0FBZ0M7T0FHdkUsRUFBQyxVQUFVLEVBQUMsTUFBTSxjQUFjO0FBRXZDOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNIO0lBa0RFLFlBQVksZUFBZ0M7UUFDMUMsSUFBSSxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQztRQUNyQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUM7UUFDN0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0gseUJBQXlCO0lBQ3pCLElBQUksS0FBVSxNQUFNLElBQUksYUFBYSxDQUFDLHdEQUF3RCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWxHOztPQUVHO0lBQ0gsSUFBSTtRQUNGLElBQUksWUFBNkIsQ0FBQztRQUNsQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM1QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLEtBQWEsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWhEOztPQUVHO0lBQ0gsZ0NBQWdDO0lBQ2hDLFdBQVc7UUFDVCxNQUFNLElBQUksYUFBYSxDQUFDLCtEQUErRCxDQUFDLENBQUM7SUFDM0YsQ0FBQztBQUNILENBQUM7QUFBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVzcG9uc2VUeXBlfSBmcm9tICcuL2VudW1zJztcbmltcG9ydCB7aXNTdHJpbmcsIGlzUHJlc2VudCwgSnNvbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcbmltcG9ydCB7QmFzZUV4Y2VwdGlvbiwgV3JhcHBlZEV4Y2VwdGlvbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9leGNlcHRpb25zJztcbmltcG9ydCB7SGVhZGVyc30gZnJvbSAnLi9oZWFkZXJzJztcbmltcG9ydCB7UmVzcG9uc2VPcHRpb25zfSBmcm9tICcuL2Jhc2VfcmVzcG9uc2Vfb3B0aW9ucyc7XG5pbXBvcnQge2lzSnNPYmplY3R9IGZyb20gJy4vaHR0cF91dGlscyc7XG5cbi8qKlxuICogQ3JlYXRlcyBgUmVzcG9uc2VgIGluc3RhbmNlcyBmcm9tIHByb3ZpZGVkIHZhbHVlcy5cbiAqXG4gKiBUaG91Z2ggdGhpcyBvYmplY3QgaXNuJ3RcbiAqIHVzdWFsbHkgaW5zdGFudGlhdGVkIGJ5IGVuZC11c2VycywgaXQgaXMgdGhlIHByaW1hcnkgb2JqZWN0IGludGVyYWN0ZWQgd2l0aCB3aGVuIGl0IGNvbWVzIHRpbWUgdG9cbiAqIGFkZCBkYXRhIHRvIGEgdmlldy5cbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogaHR0cC5yZXF1ZXN0KCdteS1mcmllbmRzLnR4dCcpLnN1YnNjcmliZShyZXNwb25zZSA9PiB0aGlzLmZyaWVuZHMgPSByZXNwb25zZS50ZXh0KCkpO1xuICogYGBgXG4gKlxuICogVGhlIFJlc3BvbnNlJ3MgaW50ZXJmYWNlIGlzIGluc3BpcmVkIGJ5IHRoZSBSZXNwb25zZSBjb25zdHJ1Y3RvciBkZWZpbmVkIGluIHRoZSBbRmV0Y2hcbiAqIFNwZWNdKGh0dHBzOi8vZmV0Y2guc3BlYy53aGF0d2cub3JnLyNyZXNwb25zZS1jbGFzcyksIGJ1dCBpcyBjb25zaWRlcmVkIGEgc3RhdGljIHZhbHVlIHdob3NlIGJvZHlcbiAqIGNhbiBiZSBhY2Nlc3NlZCBtYW55IHRpbWVzLiBUaGVyZSBhcmUgb3RoZXIgZGlmZmVyZW5jZXMgaW4gdGhlIGltcGxlbWVudGF0aW9uLCBidXQgdGhpcyBpcyB0aGVcbiAqIG1vc3Qgc2lnbmlmaWNhbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNwb25zZSB7XG4gIC8qKlxuICAgKiBPbmUgb2YgXCJiYXNpY1wiLCBcImNvcnNcIiwgXCJkZWZhdWx0XCIsIFwiZXJyb3IsIG9yIFwib3BhcXVlXCIuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIFwiZGVmYXVsdFwiLlxuICAgKi9cbiAgdHlwZTogUmVzcG9uc2VUeXBlO1xuICAvKipcbiAgICogVHJ1ZSBpZiB0aGUgcmVzcG9uc2UncyBzdGF0dXMgaXMgd2l0aGluIDIwMC0yOTlcbiAgICovXG4gIG9rOiBib29sZWFuO1xuICAvKipcbiAgICogVVJMIG9mIHJlc3BvbnNlLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBlbXB0eSBzdHJpbmcuXG4gICAqL1xuICB1cmw6IHN0cmluZztcbiAgLyoqXG4gICAqIFN0YXR1cyBjb2RlIHJldHVybmVkIGJ5IHNlcnZlci5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gMjAwLlxuICAgKi9cbiAgc3RhdHVzOiBudW1iZXI7XG4gIC8qKlxuICAgKiBUZXh0IHJlcHJlc2VudGluZyB0aGUgY29ycmVzcG9uZGluZyByZWFzb24gcGhyYXNlIHRvIHRoZSBgc3RhdHVzYCwgYXMgZGVmaW5lZCBpbiBbaWV0ZiByZmMgMjYxNlxuICAgKiBzZWN0aW9uIDYuMS4xXShodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjYxNiNzZWN0aW9uLTYuMS4xKVxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBcIk9LXCJcbiAgICovXG4gIHN0YXR1c1RleHQ6IHN0cmluZztcbiAgLyoqXG4gICAqIE5vbi1zdGFuZGFyZCBwcm9wZXJ0eVxuICAgKlxuICAgKiBEZW5vdGVzIGhvdyBtYW55IG9mIHRoZSByZXNwb25zZSBib2R5J3MgYnl0ZXMgaGF2ZSBiZWVuIGxvYWRlZCwgZm9yIGV4YW1wbGUgaWYgdGhlIHJlc3BvbnNlIGlzXG4gICAqIHRoZSByZXN1bHQgb2YgYSBwcm9ncmVzcyBldmVudC5cbiAgICovXG4gIGJ5dGVzTG9hZGVkOiBudW1iZXI7XG4gIC8qKlxuICAgKiBOb24tc3RhbmRhcmQgcHJvcGVydHlcbiAgICpcbiAgICogRGVub3RlcyBob3cgbWFueSBieXRlcyBhcmUgZXhwZWN0ZWQgaW4gdGhlIGZpbmFsIHJlc3BvbnNlIGJvZHkuXG4gICAqL1xuICB0b3RhbEJ5dGVzOiBudW1iZXI7XG4gIC8qKlxuICAgKiBIZWFkZXJzIG9iamVjdCBiYXNlZCBvbiB0aGUgYEhlYWRlcnNgIGNsYXNzIGluIHRoZSBbRmV0Y2hcbiAgICogU3BlY10oaHR0cHM6Ly9mZXRjaC5zcGVjLndoYXR3Zy5vcmcvI2hlYWRlcnMtY2xhc3MpLlxuICAgKi9cbiAgaGVhZGVyczogSGVhZGVycztcbiAgLy8gVE9ETzogU3VwcG9ydCBBcnJheUJ1ZmZlciwgSlNPTiwgRm9ybURhdGEsIEJsb2JcbiAgcHJpdmF0ZSBfYm9keTogc3RyaW5nIHwgT2JqZWN0O1xuICBjb25zdHJ1Y3RvcihyZXNwb25zZU9wdGlvbnM6IFJlc3BvbnNlT3B0aW9ucykge1xuICAgIHRoaXMuX2JvZHkgPSByZXNwb25zZU9wdGlvbnMuYm9keTtcbiAgICB0aGlzLnN0YXR1cyA9IHJlc3BvbnNlT3B0aW9ucy5zdGF0dXM7XG4gICAgdGhpcy5vayA9ICh0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPD0gMjk5KTtcbiAgICB0aGlzLnN0YXR1c1RleHQgPSByZXNwb25zZU9wdGlvbnMuc3RhdHVzVGV4dDtcbiAgICB0aGlzLmhlYWRlcnMgPSByZXNwb25zZU9wdGlvbnMuaGVhZGVycztcbiAgICB0aGlzLnR5cGUgPSByZXNwb25zZU9wdGlvbnMudHlwZTtcbiAgICB0aGlzLnVybCA9IHJlc3BvbnNlT3B0aW9ucy51cmw7XG4gIH1cblxuICAvKipcbiAgICogTm90IHlldCBpbXBsZW1lbnRlZFxuICAgKi9cbiAgLy8gVE9ETzogQmxvYiByZXR1cm4gdHlwZVxuICBibG9iKCk6IGFueSB7IHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKCdcImJsb2IoKVwiIG1ldGhvZCBub3QgaW1wbGVtZW50ZWQgb24gUmVzcG9uc2Ugc3VwZXJjbGFzcycpOyB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIHJldHVybiBib2R5IGFzIHBhcnNlZCBgSlNPTmAgb2JqZWN0LCBvciByYWlzZXMgYW4gZXhjZXB0aW9uLlxuICAgKi9cbiAganNvbigpOiBhbnkge1xuICAgIHZhciBqc29uUmVzcG9uc2U6IHN0cmluZyB8IE9iamVjdDtcbiAgICBpZiAoaXNKc09iamVjdCh0aGlzLl9ib2R5KSkge1xuICAgICAganNvblJlc3BvbnNlID0gdGhpcy5fYm9keTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKHRoaXMuX2JvZHkpKSB7XG4gICAgICBqc29uUmVzcG9uc2UgPSBKc29uLnBhcnNlKDxzdHJpbmc+dGhpcy5fYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBqc29uUmVzcG9uc2U7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYm9keSBhcyBhIHN0cmluZywgcHJlc3VtaW5nIGB0b1N0cmluZygpYCBjYW4gYmUgY2FsbGVkIG9uIHRoZSByZXNwb25zZSBib2R5LlxuICAgKi9cbiAgdGV4dCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fYm9keS50b1N0cmluZygpOyB9XG5cbiAgLyoqXG4gICAqIE5vdCB5ZXQgaW1wbGVtZW50ZWRcbiAgICovXG4gIC8vIFRPRE86IEFycmF5QnVmZmVyIHJldHVybiB0eXBlXG4gIGFycmF5QnVmZmVyKCk6IGFueSB7XG4gICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oJ1wiYXJyYXlCdWZmZXIoKVwiIG1ldGhvZCBub3QgaW1wbGVtZW50ZWQgb24gUmVzcG9uc2Ugc3VwZXJjbGFzcycpO1xuICB9XG59XG4iXX0=