"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _broccoliPersistentFilter = require("broccoli-persistent-filter");

var _broccoliPersistentFilter2 = _interopRequireDefault(_broccoliPersistentFilter);

var _compiler = require("@glimmer/compiler");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defaults(obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults);for (var i = 0; i < keys.length; i++) {
        var key = keys[i];var value = Object.getOwnPropertyDescriptor(defaults, key);if (value && value.configurable && obj[key] === undefined) {
            Object.defineProperty(obj, key, value);
        }
    }return obj;
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
}

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
        return 'export default ' + (0, _compiler.precompile)(content, { meta: { specifier: specifier, '<template-meta>': true } }) + ';';
    };

    return GlimmerTemplatePrecompiler;
}(_broccoliPersistentFilter2.default);

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
exports.default = GlimmerTemplatePrecompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci10ZW1wbGF0ZS1wcmVjb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9icm9jY29saS9nbGltbWVyLXRlbXBsYXRlLXByZWNvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLEFBQU8sQUFBTSxBQUFNLEFBQTRCLEFBQUM7Ozs7QUFDaEQsQUFBTyxBQUFFLEFBQVUsQUFBRSxBQUFNLEFBQW1CLEFBQUMsQUFPL0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFpQzswQ0FLL0I7O3dDQUFZLEFBQVMsV0FBRSxBQUFPOzs7cURBQzVCLEFBQUssQUFBQyxvQkFBRyxBQUFTLEFBQUMsQUFMckI7O2NBQVUsYUFBRyxDQUFDLEFBQUssQUFBQyxBQUFDLEFBQ3JCO2NBQWUsa0JBQUcsQUFBSSxBQUFDLEFBS3JCLEFBQUk7Y0FBQyxBQUFPLFVBQUcsQUFBTyxXQUFJLEFBQUUsQUFBQyxBQUMvQjtlQUFDOzs7eUNBRUQsQUFBYSx1Q0FBQyxBQUFPLFNBQUUsQUFBWSxjQUNqQztZQUFJLEFBQVMsWUFBRyxBQUFvQixxQkFBQyxBQUFJLEtBQUMsQUFBTyxRQUFDLEFBQVEsVUFBRSxBQUFZLEFBQUMsQUFBQyxBQUMxRSxBQUFNO2VBQUMsQUFBaUIsb0JBQUcsQUFBVSwwQkFBZSxBQUFPLFNBQUUsRUFBRSxBQUFJLE1BQUUsRUFBRSxBQUFTLHNCQUFFLEFBQWlCLG1CQUFFLEFBQUksQUFBRSxBQUFFLEFBQUMsWUFBRyxBQUFHLEFBQUMsQUFDdkgsQUFBQyxBQUNGOzs7O0FBZHdDLEFBQU07O0FBZ0IvQyw4QkFBOEIsQUFBUSxVQUFFLEFBQVksY0FDbEQ7UUFBSSxBQUFJLE9BQUcsQUFBWSxhQUFDLEFBQUssTUFBQyxBQUFHLEFBQUMsQUFBQyxBQUNuQztRQUFJLEFBQU0sU0FBRyxBQUFJLEtBQUMsQUFBSyxBQUFFLEFBQUMsQUFFMUIsQUFBcUQ7QUFDckQsQUFBRSxBQUFDO1FBQUMsQUFBSSxLQUFDLEFBQUksS0FBQyxBQUFNLFNBQUcsQUFBQyxBQUFDLE9BQUssQUFBYyxBQUFDLGdCQUFDLEFBQUMsQUFDN0MsQUFBSTthQUFDLEFBQUcsQUFBRSxBQUFDLEFBQ2IsQUFBQztBQUNELEFBQUUsQUFBQztRQUFDLEFBQUksS0FBQyxBQUFDLEFBQUMsT0FBSyxBQUFJLEFBQUMsTUFBQyxBQUFDLEFBQ3JCLEFBQUk7YUFBQyxBQUFLLEFBQUUsQUFBQyxBQUNmLEFBQUM7QUFFRCxBQUFNO1dBQUMsQUFBWSxlQUFHLEFBQVEsV0FBRyxBQUFHLE1BQUcsQUFBSSxLQUFDLEFBQUksS0FBQyxBQUFHLEFBQUMsQUFBQyxBQUN4RCxBQUFDO0FBRUQ7a0JBQWUsQUFBMEIsQUFBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBGaWx0ZXIgZnJvbSAnYnJvY2NvbGktcGVyc2lzdGVudC1maWx0ZXInO1xuaW1wb3J0IHsgcHJlY29tcGlsZSB9IGZyb20gJ0BnbGltbWVyL2NvbXBpbGVyJztcblxuaW50ZXJmYWNlIFRlbXBsYXRlTWV0YSB7XG4gICc8dGVtcGxhdGUtbWV0YT4nOiB0cnVlO1xuICBzcGVjaWZpZXI6IHN0cmluZztcbn1cblxuY2xhc3MgR2xpbW1lclRlbXBsYXRlUHJlY29tcGlsZXIgZXh0ZW5kcyBGaWx0ZXIge1xuICBleHRlbnNpb25zID0gWydoYnMnXTtcbiAgdGFyZ2V0RXh0ZW5zaW9uID0gJ2pzJztcbiAgb3B0aW9uczogYW55O1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0Tm9kZSwgb3B0aW9ucykge1xuICAgIHN1cGVyKC4uLmFyZ3VtZW50cylcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB9XG5cbiAgcHJvY2Vzc1N0cmluZyhjb250ZW50LCByZWxhdGl2ZVBhdGgpIHtcbiAgICBsZXQgc3BlY2lmaWVyID0gZ2V0VGVtcGxhdGVTcGVjaWZpZXIodGhpcy5vcHRpb25zLnJvb3ROYW1lLCByZWxhdGl2ZVBhdGgpO1xuICAgIHJldHVybiAnZXhwb3J0IGRlZmF1bHQgJyArIHByZWNvbXBpbGU8VGVtcGxhdGVNZXRhPihjb250ZW50LCB7IG1ldGE6IHsgc3BlY2lmaWVyLCAnPHRlbXBsYXRlLW1ldGE+JzogdHJ1ZSB9IH0pICsgJzsnO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlU3BlY2lmaWVyKHJvb3ROYW1lLCByZWxhdGl2ZVBhdGgpIHtcbiAgbGV0IHBhdGggPSByZWxhdGl2ZVBhdGguc3BsaXQoJy8nKTtcbiAgbGV0IHByZWZpeCA9IHBhdGguc2hpZnQoKTtcblxuICAvLyBUT0RPIC0gc2hvdWxkIHVzZSBtb2R1bGUgbWFwIGNvbmZpZyB0byBiZSByaWdvcm91c1xuICBpZiAocGF0aFtwYXRoLmxlbmd0aCAtIDFdID09PSAndGVtcGxhdGUuaGJzJykge1xuICAgIHBhdGgucG9wKCk7XG4gIH1cbiAgaWYgKHBhdGhbMF0gPT09ICd1aScpIHtcbiAgICBwYXRoLnNoaWZ0KCk7XG4gIH1cblxuICByZXR1cm4gJ3RlbXBsYXRlOi8nICsgcm9vdE5hbWUgKyAnLycgKyBwYXRoLmpvaW4oJy8nKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgR2xpbW1lclRlbXBsYXRlUHJlY29tcGlsZXI7XG4iXX0=