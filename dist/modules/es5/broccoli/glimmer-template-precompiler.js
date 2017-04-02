function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

import Filter from 'broccoli-persistent-filter';
import { precompile } from '@glimmer/compiler';

var GlimmerTemplatePrecompiler = function (_Filter) {
    _inherits(GlimmerTemplatePrecompiler, _Filter);

    function GlimmerTemplatePrecompiler(inputNode, options) {
        _classCallCheck(this, GlimmerTemplatePrecompiler);

        var _this = _possibleConstructorReturn(this, _Filter.apply(this, arguments));

        _this.extensions = ['hbs'];
        _this.targetExtension = 'js';
        _this.options = options || {};
        return _this;
    }

    GlimmerTemplatePrecompiler.prototype.processString = function processString(content, relativePath) {
        var specifier = getTemplateSpecifier(this.options.rootName, relativePath);
        return 'export default ' + precompile(content, { meta: { specifier: specifier, '<template-meta>': true } }) + ';';
    };

    return GlimmerTemplatePrecompiler;
}(Filter);

function getTemplateSpecifier(rootName, relativePath) {
    var path = relativePath.split('/');
    var prefix = path.shift();
    // TODO - should use module map config to be rigorous
    if (path[path.length - 1] === 'template.hbs') {
        path.pop();
    }
    if (path[0] === 'ui') {
        path.shift();
    }
    return 'template:/' + rootName + '/' + path.join('/');
}
export default GlimmerTemplatePrecompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci10ZW1wbGF0ZS1wcmVjb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9icm9jY29saS9nbGltbWVyLXRlbXBsYXRlLXByZWNvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsT0FBTyxBQUFNLFlBQU0sQUFBNEIsQUFBQztBQUNoRCxBQUFPLFNBQUUsQUFBVSxBQUFFLGtCQUFNLEFBQW1CLEFBQUMsQUFPL0M7O0lBQWlDOzs7QUFLL0Isd0NBQVksQUFBUyxXQUFFLEFBQU87OztxREFDNUIsQUFBSyxBQUFDLG9CQUFHLEFBQVMsQUFBQzs7QUFMckIsY0FBVSxhQUFHLENBQUMsQUFBSyxBQUFDLEFBQUM7QUFDckIsY0FBZSxrQkFBRyxBQUFJLEFBQUM7QUFLckIsQUFBSSxjQUFDLEFBQU8sVUFBRyxBQUFPLFdBQUksQUFBRSxBQUFDLEFBQy9COztBQUFDOzt5Q0FFRCxBQUFhLHVDQUFDLEFBQU8sU0FBRSxBQUFZO0FBQ2pDLFlBQUksQUFBUyxZQUFHLEFBQW9CLHFCQUFDLEFBQUksS0FBQyxBQUFPLFFBQUMsQUFBUSxVQUFFLEFBQVksQUFBQyxBQUFDO0FBQzFFLEFBQU0sZUFBQyxBQUFpQixvQkFBRyxBQUFVLFdBQWUsQUFBTyxTQUFFLEVBQUUsQUFBSSxNQUFFLEVBQUUsQUFBUyxzQkFBRSxBQUFpQixtQkFBRSxBQUFJLEFBQUUsQUFBRSxBQUFDLFlBQUcsQUFBRyxBQUFDLEFBQ3ZIO0FBQUMsQUFDRjs7O0VBZHdDLEFBQU07O0FBZ0IvQyw4QkFBOEIsQUFBUSxVQUFFLEFBQVk7QUFDbEQsUUFBSSxBQUFJLE9BQUcsQUFBWSxhQUFDLEFBQUssTUFBQyxBQUFHLEFBQUMsQUFBQztBQUNuQyxRQUFJLEFBQU0sU0FBRyxBQUFJLEtBQUMsQUFBSyxBQUFFLEFBQUM7QUFFMUIsQUFBcUQ7QUFDckQsQUFBRSxBQUFDLFFBQUMsQUFBSSxLQUFDLEFBQUksS0FBQyxBQUFNLFNBQUcsQUFBQyxBQUFDLE9BQUssQUFBYyxBQUFDLGdCQUFDLEFBQUM7QUFDN0MsQUFBSSxhQUFDLEFBQUcsQUFBRSxBQUFDLEFBQ2I7QUFBQztBQUNELEFBQUUsQUFBQyxRQUFDLEFBQUksS0FBQyxBQUFDLEFBQUMsT0FBSyxBQUFJLEFBQUMsTUFBQyxBQUFDO0FBQ3JCLEFBQUksYUFBQyxBQUFLLEFBQUUsQUFBQyxBQUNmO0FBQUM7QUFFRCxBQUFNLFdBQUMsQUFBWSxlQUFHLEFBQVEsV0FBRyxBQUFHLE1BQUcsQUFBSSxLQUFDLEFBQUksS0FBQyxBQUFHLEFBQUMsQUFBQyxBQUN4RDtBQUFDO0FBRUQsZUFBZSxBQUEwQixBQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEZpbHRlciBmcm9tICdicm9jY29saS1wZXJzaXN0ZW50LWZpbHRlcic7XG5pbXBvcnQgeyBwcmVjb21waWxlIH0gZnJvbSAnQGdsaW1tZXIvY29tcGlsZXInO1xuXG5pbnRlcmZhY2UgVGVtcGxhdGVNZXRhIHtcbiAgJzx0ZW1wbGF0ZS1tZXRhPic6IHRydWU7XG4gIHNwZWNpZmllcjogc3RyaW5nO1xufVxuXG5jbGFzcyBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlciBleHRlbmRzIEZpbHRlciB7XG4gIGV4dGVuc2lvbnMgPSBbJ2hicyddO1xuICB0YXJnZXRFeHRlbnNpb24gPSAnanMnO1xuICBvcHRpb25zOiBhbnk7XG5cbiAgY29uc3RydWN0b3IoaW5wdXROb2RlLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoLi4uYXJndW1lbnRzKVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIH1cblxuICBwcm9jZXNzU3RyaW5nKGNvbnRlbnQsIHJlbGF0aXZlUGF0aCkge1xuICAgIGxldCBzcGVjaWZpZXIgPSBnZXRUZW1wbGF0ZVNwZWNpZmllcih0aGlzLm9wdGlvbnMucm9vdE5hbWUsIHJlbGF0aXZlUGF0aCk7XG4gICAgcmV0dXJuICdleHBvcnQgZGVmYXVsdCAnICsgcHJlY29tcGlsZTxUZW1wbGF0ZU1ldGE+KGNvbnRlbnQsIHsgbWV0YTogeyBzcGVjaWZpZXIsICc8dGVtcGxhdGUtbWV0YT4nOiB0cnVlIH0gfSkgKyAnOyc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVTcGVjaWZpZXIocm9vdE5hbWUsIHJlbGF0aXZlUGF0aCkge1xuICBsZXQgcGF0aCA9IHJlbGF0aXZlUGF0aC5zcGxpdCgnLycpO1xuICBsZXQgcHJlZml4ID0gcGF0aC5zaGlmdCgpO1xuXG4gIC8vIFRPRE8gLSBzaG91bGQgdXNlIG1vZHVsZSBtYXAgY29uZmlnIHRvIGJlIHJpZ29yb3VzXG4gIGlmIChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09ICd0ZW1wbGF0ZS5oYnMnKSB7XG4gICAgcGF0aC5wb3AoKTtcbiAgfVxuICBpZiAocGF0aFswXSA9PT0gJ3VpJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIHJldHVybiAndGVtcGxhdGU6LycgKyByb290TmFtZSArICcvJyArIHBhdGguam9pbignLycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlcjtcbiJdfQ==