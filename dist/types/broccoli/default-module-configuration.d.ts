declare var _default: {
    types: {
        application: {
            definitiveCollection: string;
        };
        component: {
            definitiveCollection: string;
        };
        helper: {
            definitiveCollection: string;
        };
        renderer: {
            definitiveCollection: string;
        };
        template: {
            definitiveCollection: string;
        };
    };
    collections: {
        main: {
            types: string[];
        };
        components: {
            group: string;
            types: string[];
            defaultType: string;
            privateCollections: string[];
        };
        styles: {
            group: string;
            unresolvable: boolean;
        };
        utils: {
            unresolvable: boolean;
        };
    };
};
export default _default;
