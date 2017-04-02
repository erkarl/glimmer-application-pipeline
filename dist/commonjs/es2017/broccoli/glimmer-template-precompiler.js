'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _broccoliPersistentFilter = require('broccoli-persistent-filter');

var _broccoliPersistentFilter2 = _interopRequireDefault(_broccoliPersistentFilter);

var _compiler = require('@glimmer/compiler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class GlimmerTemplatePrecompiler extends _broccoliPersistentFilter2.default {
    constructor(inputNode, options) {
        super(...arguments);
        this.extensions = ['hbs'];
        this.targetExtension = 'js';
        this.options = options || {};
    }
    processString(content, relativePath) {
        let specifier = getTemplateSpecifier(this.options.rootName, relativePath);
        return 'export default ' + (0, _compiler.precompile)(content, { meta: { specifier, '<template-meta>': true } }) + ';';
    }
}
function getTemplateSpecifier(rootName, relativePath) {
    let path = relativePath.split('/');
    let prefix = path.shift();
    // TODO - should use module map config to be rigorous
    if (path[path.length - 1] === 'template.hbs') {
        path.pop();
    }
    if (path[0] === 'ui') {
        path.shift();
    }
    return 'template:/' + rootName + '/' + path.join('/');
}
exports.default = GlimmerTemplatePrecompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci10ZW1wbGF0ZS1wcmVjb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9icm9jY29saS9nbGltbWVyLXRlbXBsYXRlLXByZWNvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLEFBQU8sQUFBTSxBQUFNLEFBQTRCLEFBQUM7Ozs7QUFDaEQsQUFBTyxBQUFFLEFBQVUsQUFBRSxBQUFNLEFBQW1CLEFBQUM7Ozs7QUFPL0MsTUFBaUMsQUFBUSxBQUFNO0FBSzdDLGdCQUFZLEFBQVMsV0FBRSxBQUFPO0FBQzVCLEFBQUssY0FBQyxHQUFHLEFBQVMsQUFBQztBQUxyQixhQUFVLGFBQUcsQ0FBQyxBQUFLLEFBQUMsQUFBQztBQUNyQixhQUFlLGtCQUFHLEFBQUksQUFBQztBQUtyQixBQUFJLGFBQUMsQUFBTyxVQUFHLEFBQU8sV0FBSSxBQUFFLEFBQUMsQUFDL0I7QUFBQztBQUVELEFBQWEsa0JBQUMsQUFBTyxTQUFFLEFBQVk7QUFDakMsWUFBSSxBQUFTLFlBQUcsQUFBb0IscUJBQUMsQUFBSSxLQUFDLEFBQU8sUUFBQyxBQUFRLFVBQUUsQUFBWSxBQUFDLEFBQUM7QUFDMUUsQUFBTSxlQUFDLEFBQWlCLG9CQUFHLEFBQVUsMEJBQWUsQUFBTyxTQUFFLEVBQUUsQUFBSSxNQUFFLEVBQUUsQUFBUyxXQUFFLEFBQWlCLG1CQUFFLEFBQUksQUFBRSxBQUFFLEFBQUMsWUFBRyxBQUFHLEFBQUMsQUFDdkg7QUFBQyxBQUNGOztBQUVELDhCQUE4QixBQUFRLFVBQUUsQUFBWTtBQUNsRCxRQUFJLEFBQUksT0FBRyxBQUFZLGFBQUMsQUFBSyxNQUFDLEFBQUcsQUFBQyxBQUFDO0FBQ25DLFFBQUksQUFBTSxTQUFHLEFBQUksS0FBQyxBQUFLLEFBQUUsQUFBQztBQUUxQixBQUFxRDtBQUNyRCxBQUFFLEFBQUMsUUFBQyxBQUFJLEtBQUMsQUFBSSxLQUFDLEFBQU0sU0FBRyxBQUFDLEFBQUMsT0FBSyxBQUFjLEFBQUMsZ0JBQUMsQUFBQztBQUM3QyxBQUFJLGFBQUMsQUFBRyxBQUFFLEFBQUMsQUFDYjtBQUFDO0FBQ0QsQUFBRSxBQUFDLFFBQUMsQUFBSSxLQUFDLEFBQUMsQUFBQyxPQUFLLEFBQUksQUFBQyxNQUFDLEFBQUM7QUFDckIsQUFBSSxhQUFDLEFBQUssQUFBRSxBQUFDLEFBQ2Y7QUFBQztBQUVELEFBQU0sV0FBQyxBQUFZLGVBQUcsQUFBUSxXQUFHLEFBQUcsTUFBRyxBQUFJLEtBQUMsQUFBSSxLQUFDLEFBQUcsQUFBQyxBQUFDLEFBQ3hEO0FBQUMsQUFFRDtrQkFBZSxBQUEwQixBQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEZpbHRlciBmcm9tICdicm9jY29saS1wZXJzaXN0ZW50LWZpbHRlcic7XG5pbXBvcnQgeyBwcmVjb21waWxlIH0gZnJvbSAnQGdsaW1tZXIvY29tcGlsZXInO1xuXG5pbnRlcmZhY2UgVGVtcGxhdGVNZXRhIHtcbiAgJzx0ZW1wbGF0ZS1tZXRhPic6IHRydWU7XG4gIHNwZWNpZmllcjogc3RyaW5nO1xufVxuXG5jbGFzcyBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlciBleHRlbmRzIEZpbHRlciB7XG4gIGV4dGVuc2lvbnMgPSBbJ2hicyddO1xuICB0YXJnZXRFeHRlbnNpb24gPSAnanMnO1xuICBvcHRpb25zOiBhbnk7XG5cbiAgY29uc3RydWN0b3IoaW5wdXROb2RlLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoLi4uYXJndW1lbnRzKVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIH1cblxuICBwcm9jZXNzU3RyaW5nKGNvbnRlbnQsIHJlbGF0aXZlUGF0aCkge1xuICAgIGxldCBzcGVjaWZpZXIgPSBnZXRUZW1wbGF0ZVNwZWNpZmllcih0aGlzLm9wdGlvbnMucm9vdE5hbWUsIHJlbGF0aXZlUGF0aCk7XG4gICAgcmV0dXJuICdleHBvcnQgZGVmYXVsdCAnICsgcHJlY29tcGlsZTxUZW1wbGF0ZU1ldGE+KGNvbnRlbnQsIHsgbWV0YTogeyBzcGVjaWZpZXIsICc8dGVtcGxhdGUtbWV0YT4nOiB0cnVlIH0gfSkgKyAnOyc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVTcGVjaWZpZXIocm9vdE5hbWUsIHJlbGF0aXZlUGF0aCkge1xuICBsZXQgcGF0aCA9IHJlbGF0aXZlUGF0aC5zcGxpdCgnLycpO1xuICBsZXQgcHJlZml4ID0gcGF0aC5zaGlmdCgpO1xuXG4gIC8vIFRPRE8gLSBzaG91bGQgdXNlIG1vZHVsZSBtYXAgY29uZmlnIHRvIGJlIHJpZ29yb3VzXG4gIGlmIChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09ICd0ZW1wbGF0ZS5oYnMnKSB7XG4gICAgcGF0aC5wb3AoKTtcbiAgfVxuICBpZiAocGF0aFswXSA9PT0gJ3VpJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIHJldHVybiAndGVtcGxhdGU6LycgKyByb290TmFtZSArICcvJyArIHBhdGguam9pbignLycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlcjtcbiJdfQ==