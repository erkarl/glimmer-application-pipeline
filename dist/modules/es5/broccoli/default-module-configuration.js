export default {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1tb2R1bGUtY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9icm9jY29saS9kZWZhdWx0LW1vZHVsZS1jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0UsQUFBSztBQUNILEFBQVcscUJBQUUsRUFBRSxBQUFvQixzQkFBRSxBQUFNLEFBQUU7QUFDN0MsQUFBUyxtQkFBRSxFQUFFLEFBQW9CLHNCQUFFLEFBQVksQUFBRTtBQUNqRCxBQUFNLGdCQUFFLEVBQUUsQUFBb0Isc0JBQUUsQUFBWSxBQUFFO0FBQzlDLEFBQVEsa0JBQUUsRUFBRSxBQUFvQixzQkFBRSxBQUFNLEFBQUU7QUFDMUMsQUFBUSxrQkFBRSxFQUFFLEFBQW9CLHNCQUFFLEFBQVksQUFBRSxBQUNqRDtBQU5NO0FBT1AsQUFBVztBQUNULEFBQUk7QUFDRixBQUFLLG1CQUFFLENBQUMsQUFBYSxlQUFFLEFBQVUsQUFBQyxBQUNuQztBQUZLO0FBR04sQUFBVTtBQUNSLEFBQUssbUJBQUUsQUFBSTtBQUNYLEFBQUssbUJBQUUsQ0FBQyxBQUFXLGFBQUUsQUFBVSxZQUFFLEFBQVEsQUFBQztBQUMxQyxBQUFXLHlCQUFFLEFBQVc7QUFDeEIsQUFBa0IsZ0NBQUUsQ0FBQyxBQUFPLEFBQUMsQUFDOUI7QUFMVztBQU1aLEFBQU07QUFDSixBQUFLLG1CQUFFLEFBQUk7QUFDWCxBQUFZLDBCQUFFLEFBQUksQUFDbkI7QUFITztBQUlSLEFBQUs7QUFDSCxBQUFZLDBCQUFFLEFBQUksQUFDbkIsQUFDRixBQUNGLEFBQUM7QUFKUztBQWRJO0FBUkEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCB7XG4gIHR5cGVzOiB7XG4gICAgYXBwbGljYXRpb246IHsgZGVmaW5pdGl2ZUNvbGxlY3Rpb246ICdtYWluJyB9LFxuICAgIGNvbXBvbmVudDogeyBkZWZpbml0aXZlQ29sbGVjdGlvbjogJ2NvbXBvbmVudHMnIH0sXG4gICAgaGVscGVyOiB7IGRlZmluaXRpdmVDb2xsZWN0aW9uOiAnY29tcG9uZW50cycgfSxcbiAgICByZW5kZXJlcjogeyBkZWZpbml0aXZlQ29sbGVjdGlvbjogJ21haW4nIH0sXG4gICAgdGVtcGxhdGU6IHsgZGVmaW5pdGl2ZUNvbGxlY3Rpb246ICdjb21wb25lbnRzJyB9XG4gIH0sXG4gIGNvbGxlY3Rpb25zOiB7XG4gICAgbWFpbjoge1xuICAgICAgdHlwZXM6IFsnYXBwbGljYXRpb24nLCAncmVuZGVyZXInXVxuICAgIH0sXG4gICAgY29tcG9uZW50czoge1xuICAgICAgZ3JvdXA6ICd1aScsXG4gICAgICB0eXBlczogWydjb21wb25lbnQnLCAndGVtcGxhdGUnLCAnaGVscGVyJ10sXG4gICAgICBkZWZhdWx0VHlwZTogJ2NvbXBvbmVudCcsXG4gICAgICBwcml2YXRlQ29sbGVjdGlvbnM6IFsndXRpbHMnXVxuICAgIH0sXG4gICAgc3R5bGVzOiB7XG4gICAgICBncm91cDogJ3VpJyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgdXRpbHM6IHtcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH1cbiAgfVxufTtcbiJdfQ==