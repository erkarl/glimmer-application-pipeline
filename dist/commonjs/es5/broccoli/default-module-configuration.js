'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = {
    types: {
        application: { definitiveCollection: 'main' },
        component: { definitiveCollection: 'components' },
        helper: { definitiveCollection: 'components' },
        renderer: { definitiveCollection: 'main' },
        template: { definitiveCollection: 'components' }
    },
    collections: {
        main: {
            types: ['application', 'renderer']
        },
        components: {
            group: 'ui',
            types: ['component', 'template', 'helper'],
            defaultType: 'component',
            privateCollections: ['utils']
        },
        styles: {
            group: 'ui',
            unresolvable: true
        },
        utils: {
            unresolvable: true
        }
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1tb2R1bGUtY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9icm9jY29saS9kZWZhdWx0LW1vZHVsZS1jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7cUJBRWlCLEVBQUUsQUFBb0Isc0JBQUUsQUFBTSxBQUFFLEFBQzdDLEFBQVM7bUJBQUUsRUFBRSxBQUFvQixzQkFBRSxBQUFZLEFBQUUsQUFDakQsQUFBTTtnQkFBRSxFQUFFLEFBQW9CLHNCQUFFLEFBQVksQUFBRSxBQUM5QyxBQUFRO2tCQUFFLEVBQUUsQUFBb0Isc0JBQUUsQUFBTSxBQUFFLEFBQzFDLEFBQVE7a0JBQUUsRUFBRSxBQUFvQixzQkFMM0IsQUFLNkIsQUFBWSxBQUFFLEFBQ2pELEFBQ0QsQUFBVztBQU5ULEFBQVc7OzttQkFRRixDQUFDLEFBQWEsZUFEakIsQUFDbUIsQUFBVSxBQUFDLEFBQ25DLEFBQ0QsQUFBVTtBQUZSLEFBQUs7O21CQUdFLEFBQUksQUFDWCxBQUFLO21CQUFFLENBQUMsQUFBVyxhQUFFLEFBQVUsWUFBRSxBQUFRLEFBQUMsQUFDMUMsQUFBVzt5QkFBRSxBQUFXLEFBQ3hCLEFBQWtCO2dDQUFFLENBSlYsQUFJVyxBQUFPLEFBQUMsQUFDOUIsQUFDRCxBQUFNO0FBTEosQUFBSzs7bUJBTUUsQUFBSSxBQUNYLEFBQVk7MEJBRk4sQUFFUSxBQUFJLEFBQ25CLEFBQ0QsQUFBSztBQUhILEFBQUs7OzBCQW5CSSxBQVFBLEFBY0osQUFDUyxBQUFJLEFBQ25CLEFBQ0YsQUFDRixBQUFDO0FBSEksQUFBWTtBQWRkLEFBQUk7QUFSTixBQUFLIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQge1xuICB0eXBlczoge1xuICAgIGFwcGxpY2F0aW9uOiB7IGRlZmluaXRpdmVDb2xsZWN0aW9uOiAnbWFpbicgfSxcbiAgICBjb21wb25lbnQ6IHsgZGVmaW5pdGl2ZUNvbGxlY3Rpb246ICdjb21wb25lbnRzJyB9LFxuICAgIGhlbHBlcjogeyBkZWZpbml0aXZlQ29sbGVjdGlvbjogJ2NvbXBvbmVudHMnIH0sXG4gICAgcmVuZGVyZXI6IHsgZGVmaW5pdGl2ZUNvbGxlY3Rpb246ICdtYWluJyB9LFxuICAgIHRlbXBsYXRlOiB7IGRlZmluaXRpdmVDb2xsZWN0aW9uOiAnY29tcG9uZW50cycgfVxuICB9LFxuICBjb2xsZWN0aW9uczoge1xuICAgIG1haW46IHtcbiAgICAgIHR5cGVzOiBbJ2FwcGxpY2F0aW9uJywgJ3JlbmRlcmVyJ11cbiAgICB9LFxuICAgIGNvbXBvbmVudHM6IHtcbiAgICAgIGdyb3VwOiAndWknLFxuICAgICAgdHlwZXM6IFsnY29tcG9uZW50JywgJ3RlbXBsYXRlJywgJ2hlbHBlciddLFxuICAgICAgZGVmYXVsdFR5cGU6ICdjb21wb25lbnQnLFxuICAgICAgcHJpdmF0ZUNvbGxlY3Rpb25zOiBbJ3V0aWxzJ11cbiAgICB9LFxuICAgIHN0eWxlczoge1xuICAgICAgZ3JvdXA6ICd1aScsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHV0aWxzOiB7XG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9XG4gIH1cbn07XG4iXX0=