var _ = require('lodash');

// This is the structure of the store
var ___store = {
    a: {
        b: {
                __value: 2,
                __meta: {},
        },
        c: {
            __value: 3,
            __meta: {}
        },
        __meta: {},
    }
};

module.exports = function () {
    var store = {};
    var that = {};

    that.raw = () => store;
    that.dump = () => {
        return _.keys(store).reduce((memo, k) => {
                memo[k] = that.getValue(k);
            return memo;
        }, {});
    };

    that.load = (obj) => {
        _.keys(obj).forEach(k => that.setValue(k, obj[k]));
    };

    that.delete = key => {
        key.split('.').reduce((memo, it, idx) => {
            var obj = memo[it];
            obj && idx === key.split('.').length - 1 && delete memo[it];
            return memo[it];
        }, store);
    };

    that.setMeta = (key, data) => {
        var leaf = that.getLeaf(key);
        leaf.__meta = leaf.__meta || {};

        _.extend(leaf.__meta, data);
    };

    that.getMeta = (key, name) => {
        var leaf = that.getLeaf(key);
        return leaf.__meta ? (name ? leaf.__meta[name] : leaf.__meta) : undefined;
    };

    that.setValue = (key, value) => {
        if(_.isArray(value)) {
            that.setMeta(key, {type: 'array'})
            clearExtraArrayValues();
            return [key].concat(value.map((it, idx) => that.setValue(`${key}.${idx}`, it)));
        }

        if(_.isPlainObject(value)) {
            that.setMeta(key, {type: 'object'});
            return [key].concat(_.map(value, (v, k) => that.setValue(`${key}.${k}`, v)));
        }

        that.setMeta(key, {type: 'plain'});
        that.getLeaf(key).__value = value;
        return [key];

        function clearExtraArrayValues() {
            var curr = that.getValue(key);
            if(_.isArray(curr)) {
                var extra = curr.length - value.length;
                if(extra > 0) {
                    for(var i = value.length;i < value.length + extra; i++) {
                        that.delete(`${key}.${i}`)
                    }
                }
            }
        }
    };

    that.getValue = (key) => {
        var leaf = that.getLeaf(key);
        var value = leaf.__value;
        var type = leaf.__meta ? leaf.__meta.type : undefined;
        var props = getProps(leaf);

        if(type === undefined && props.length === 0) {
            return undefined;
        }

        if(value !== undefined) {
            return value;
        }


        if (props.length === 0 && type !== 'object' && type !== 'array') {
            return undefined;
        }

        if(that.getMeta(key, 'type') === 'array') {
            return props.map(idx => that.getValue(`${key}.${idx}`));
        }

        return props.reduce((memo, prop) => {
            var val = that.getValue(`${key}.${prop}`);
            val !== undefined && (memo[prop] = val);
            return memo;
        }, {});
    };

    that.getLeafIfExists = key => that.getLeaf(key, false);

    that.getLeaf = (key, create = true) => {
        var parts = key.split('.');

        // try is a cheap way to break the reduce if we are not creating objects as we go
        try {
            return parts.reduce((storeObj, part, idx) => {
                if (!storeObj[part]) {
                    create && (storeObj[part] = {});
                }
                return storeObj[part];
            }, store);
        } catch(e) {
            return undefined;
        }
    };

    that.getLeafs = (key) => {
        var root = that.getLeafIfExists(key);
        return root ? _.flattenDeep(walk(root)) : [];

        function walk(root) {
            return getProps(root).reduce((leafs, prop) => {
                var child = root[prop];
                isLeaf(child) ? leafs.push(child) : leafs.push(walk(child));
                return leafs;
            }, []);
        };
    };

    return that;

    function getProps(leaf) {
        return _.without(_.keys(leaf), '__value', '__meta');
    }

    function isLeaf(candidate) {
        return candidate.__value !== undefined && getProps(candidate).length === 0;
    };


}
