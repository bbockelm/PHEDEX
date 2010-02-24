/**
 * This is the base class for all PhEDEx treeview-related modules. It extends PHEDEX.Module to provide the functionality needed for modules that use a YAHOO.Widget.TreeView.
 * @namespace PHEDEX
 * @class TreeView
 * @constructor
 * @param sandbox {PHEDEX.Sandbox} reference to a PhEDEx sandbox object
 * @param string {string} a string to use as the base-name of the <strong>Id</strong> for this module
 */
PHEDEX.TreeView = function(sandbox,string) {
  YAHOO.lang.augmentObject(this,new PHEDEX.Module(sandbox,string));
  var _me  = 'treeview',
      _sbx = sandbox;

  /**
   * this instantiates the actual object, and is called internally by the constructor. This allows control of the construction-sequence, first augmenting the object with the base-class, then constructing the specific elements of this object here, then any post-construction operations before returning from the constructor
   * @method _construct
   * @private
   */
  _construct = function() {
    return {

/**
 * An object containing metadata that describes the treeview internals. Used as a convenience to keep from polluting the namespace too much with public variables that the end-module does not need. This is essentially re-hashed data from the 'meta' construct used to describe the tree. Keeping this data here distinguishes it from the 'meta' in the debugger, and emphasises that it is not needed for the description of the tree, only to make it work in the application.
 * @property _cfg
 * @type object
 * @private
 */
/**
 * An array mapping DOM element-iDs to treeview-branches, for use in mouse-over handlers etc
 * @property textNodeMap
 * @type array
 * @private
 */
      _cfg: { textNodeMap:[], classes:{}, contextArgs:[], sortFields:{}, formats:{} },

      hiddenBranches: {},

/**
 * Used in PHEDEX.Module and elsewhere to derive the type of certain decorator-style objects, such as mouseover handlers etc. These can be different for TreeView and DataTable objects, so will be picked up as PHEDEX.[this.type].function(), or similar.
 * @property type
 * @default TreeView
 * @type string
 * @private
 * @final
 */
      type: 'TreeView',

// Now a series of functions for manipulating an element based on its CSS classes. Use two namespaces, phedex-tnode-* which describes
// the tree structure, and phedex-tree-* which describe the data-contents.
      getPhedexFieldClass: function(el) {
//      find the phedex-tree-* classname of this element
        var treeMatch = /^phedex-tree-/,
            elClasses = el.className.split(' ');
        for (var i in elClasses) {
          if ( elClasses[i].match(treeMatch) ) {
            return elClasses[i];
          }
        }
        return;
      },

      locatePartnerFields: function(el) {
//      for a tnode-header, find all tnode-fields of that type. For a tnode-field, find only the tnode-header that matches
//      assumes that the element it is given is already either a tnode-header or a tnode-field, use locateNode to ensure that
//      before calling this function
        var treeMatch = /^phedex-tree-/,
            treeOther,
            candList,
            elList=[],
            elClasses;
        if(YuD.hasClass(el,'phedex-tnode-header')) { treeOther = 'phedex-tnode-field'; }
        else                                       { treeOther = 'phedex-tnode-header'; }
        elClasses = el.className.split(' ');
        for (var i in elClasses) {
          if ( elClasses[i].match(treeMatch) ) {
            candList = YuD.getElementsByClassName(elClasses[i], 'div', this.el);
            break;
          }
        }
        for (var i in candList )
        {
          if ( YuD.hasClass(candList[i],treeOther) )
          {
            elList.push(candList[i]);
          }
        }
        return elList;
      },

      locateNode: function(el) {
//      find the nearest ancestor that has a phedex-tnode-* class applied to it, either phedex-tnode-field or phedex-tnode-header
//      Explicitly do this as two separate loops as an optimisation. Most of the time I expect to be looking at a value-node, in the data,
//      so search the headers only as a second step.
        var el1 = el; // preserve the original el in case it's a header
        while (el1.id != this.el.id) { // walk up only as far as the widget-div
          if(YuD.hasClass(el1,'phedex-tnode-field')) { // phedex-tnode fields hold the values.
            return el1;
          }
          el1 = el1.parentNode;
        }
        while (el.id != this.el.id) { // walk up only as far as the widget-div
          if(YuD.hasClass(el,'phedex-tnode-header')) { // phedex-tnode headers hold the value-names.
            return el;
          }
          el = el.parentNode;
        }
      },

      locateHeader: function(el) {
//      find the phedex-tnode-header element for this element
        while (el.id != this.el.id) { // walk up only as far as the widget-div
          if(YuD.hasClass(el,'phedex-tnode-field')) { // phedex-tnode fields hold the values.
            var elList = this.locatePartnerFields(el);
            return elList[0];
          }
          if(YuD.hasClass(el,'phedex-tnode-header')) { // phedex-tnode headers hold the value-names.
            return el;
          }
          el = el.parentNode;
        }
      },

      locateBranch: function(el) {
//      find the tree-branch that this DOM node is in
        var tgt = YuD.hasClass(el, "ygtvlabel") ? el : YuD.getAncestorByClassName(el, "ygtvlabel");
        if ( tgt ) {
          return this._cfg.textNodeMap[tgt.id];
        }
      },

/** create the treeview structures for the headers, create the empty tree for the contents (waiting for data), and initialise dynamic loading for the tree, if required. Driven mostly by the <strong>meta</strong> field.
 * @method initDerived
 */
      initDerived: function() {
        this.tree       = new YAHOO.widget.TreeView(this.dom.content);
        this.headerTree = new YAHOO.widget.TreeView(this.dom.extra);
        var currentIconMode = 0,
            root = this.headerTree.getRoot(),
            t = this.meta.tree,
            htNode;
//      turn dynamic loading on for entire tree?
        if ( this.meta.isDynamic ) {
          this.tree.setDynamicLoad(this.loadTreeNodeData, currentIconMode);
        }
        for (var i in t)
        {
          htNode = this.addNode( t[i], null, root );
          htNode.expand();
          root = htNode;
        }
        htNode.isLeaf = true;

        this.tree.subscribe('expandComplete', function(obj) {
          return function(node) {
          }
        }(this));
        this.headerTree.render();

        this.meta._filter = this.createFilterMeta();
        this.decorators.push(
          {
            name:'Filter',
            source:'component-filter',
            payload:{
              control: {
                parent: 'control',
                payload:{
                  disabled: false, //true,
                  hidden:   true,
                },
                el: 'content',
              },
            },
            target:  'filter',
          });
        this.decorators.push({ name:'Sort' });
        this.decorators.push({ name:'Resize' });
        _sbx.notify(this.id,'initDerived');
      },

      postExpand: function(step,node) {
        var steps = [], i, j;
        steps.push('doSort'); steps.push('doFilter'); steps.push('doResize'); steps.push('hideFIelds');
          this.markOverflows();
          for (i in steps) { _sbx.notify(this.id,steps[i]); }
      },

      addNode: function(spec,values,parent) {
        if ( !parent ) { parent = this.tree.getRoot(); }
        var isHeader = false,
            el, tNode;
        if ( !values ) { isHeader = true; }
        if ( values && (spec.format.length != values.length) )
        {
          throw new Error('PHEDEX.TreeView: length of "values" array and "format" arrays differs ('+values.length+' != '+spec.format.length+'). Not good!');
        }
        if ( ! spec.className )
        {
          if ( isHeader ) { spec.className = 'phedex-tnode-header'; }
          else            { spec.className = 'phedex-tnode-field'; }
        }
        if ( !this.meta.hide ) { this.meta.hide = {}; }
        el = PxU.makeNode(spec,values);
        tNode = new YAHOO.widget.TextNode({label: el.innerHTML, expanded: false}, parent);
        this._cfg.textNodeMap[tNode.labelElId] = tNode;
        tNode.data.values = values;
        tNode.data.spec   = spec;
        if ( spec.payload ) { tNode.payload = spec.payload; }

//      If I'm building the header-nodes, do some metadata management at this point.
        if ( isHeader ) {
          for (var i in spec.format) {
            var f = spec.format[i],
                className = f.className,
                value;
            f.width = f.width + 'px';
            this._cfg.formats[className] = f;
            if ( values ) { value = values[i]; }
            else { value = f.text; }
            if ( spec.name ) { value = spec.name+': '+value; }
            if ( this._cfg.classes[className] ) {
              log('duplicate entry for '+className+': "'+this._cfg.classes[className].value+'" and "'+value+'"','error','treeview');
            } else {
              this._cfg.classes[className] = {value:value, group:spec.name};
              this._cfg.sortFields[spec.name] = {};
              if ( spec.format[i].contextArgs )
              {
                this._cfg.contextArgs[className]=[];
                if ( typeof(f.contextArgs) == 'string' ) {
                  this._cfg.contextArgs[className].push(f.contextArgs);
                } else {
                  for (var j in f.contextArgs) {
                    this._cfg.contextArgs[className].push(f.contextArgs[j]);
                  }
                }
              }
            }

            if ( f.hide ) {
              this.meta.hide[className] = 1;
            }
          }
        }
        return tNode;
      },

/** Remove all dhild branches from the tree, i.e. wipe it out. Useful when changing parameters and getting fresh data for an already existing tree, or during destruction of the module
 * @method truncateTree
 */
      truncateTree: function() {
        var i;
        while (i = this.tree.root.children[0]) { this.tree.removeNode(i); }
      },

      menuSelectItem: function(args) {
        for (var i in args) {
          YuD.getElementsByClassName(args[i],null,this.el,function(element) {
            element.style.display = null;
          });
          delete this.meta.hide[args[i]];
        }
        _sbx.notify(this.id, 'updateHistory');
      },

      hideFieldByClass: function(className,el) {
        if ( !el ) { el = this.el; }
        log('hideFieldByClass: '+className,'info','treeview');
        YuD.getElementsByClassName(className,null,el,function(element) {
          element.style.display = 'none';
        });
        _sbx.notify(this.id,'hideColumn',{text: this._cfg.classes[className].value, value:className});
//                 _sbx.notify(this.id, 'updateHistory');
      },

      /**
      * hide all columns which have been declared to be hidden. Needed on initial rendering, on update, or after filtering. Uses <strong>this.meta.hide</strong> to determine what to hide.
      * @method hideFields
      */
      hideFields: function(el) {
        if ( this.meta.hide ) {
          for (var i in this.meta.hide) {
            this.hideFieldByClass(i,el);
          }
        }
      },

      markOverflows: function() {
        var el, elList = YuD.getElementsByClassName('spanWrap',null,this.el);
        for (var i in elList) {
          el = this.locateNode(elList[i]);
          var h1 = elList[i].offsetHeight,
              h2 = el.offsetHeight;
          if ( h1/h2 > 1.2 ) { // the element overflows its container, by a generous amount...
            YuD.addClass(el,'phedex-tnode-overflow');
          } else {
            YuD.removeClass(el,'phedex-tnode-overflow');
          }
        }
      },

//    This is for dynamically loading data into YUI TreeViews.
      loadTreeNodeData: function(node, fnLoadComplete) {
//    First, create a callback function that uses the payload to identify what to do with the returned data.
        var tNode,
            loadTreeNodeData_callback = function(result) {
            if ( result.stack ) {
              log('loadTreeNodeData: failed to get data','error',_me);
            } else {
              try {
                node.payload.callback(node,result);
//                 _sbx.notify(node.payload.obj.id,'hideFields'); // this may be the kosher way of doing things...
              } catch(e) {
                banner('error fetching data for tree-branch','error',_me);
                log('Error in loadTreeNodeData_callback ('+err(ex)+')','error',_me);
                tNode = new YAHOO.widget.TextNode({label: 'Data-loading error, try again later...', expanded: false}, node);
                tNode.isLeaf = true;
              }
            }
            fnLoadComplete();
            node.payload.obj.postExpand();
          }

//      Now, find out what to get, if anything...
        if ( typeof(node.payload) == 'undefined' )
        {
//        This need not be an error, so don't log it. Some branches are built on already-known data, and do not require new
//        data to be fetched. If dynamic loading is on for the whole tree this code will be hit for those branches.
          fnLoadComplete();
          return;
        }
        if ( node.payload.call )
        {
          if ( typeof(node.payload.call) == 'string' )
          {
//          payload calls which are strings are assumed to be Datasvc call names, so pick them up from the Datasvc namespace,
//          and conform to the calling specification for the data-service module
            log('in PHEDEX.TreeView.loadTreeNodeData for '+node.payload.call,'info',_me);
            var query = [];
            query.api = node.payload.call;
            query.args = node.payload.args;
            query.callback = loadTreeNodeData_callback;
            PHEDEX.Datasvc.Call(query);
          } else {
//          The call-name isn't a string, assume it's a function and call it directly.
//          I'm guessing there may be a use for this, but I don't know what it is yet...
            log('Apparently require dynamically loaded data from a specified function. This code has not been tested yet','warn',_me);
            node.payload.call(node,loadTreeNodeData_callback);
          }
        } else {
          log('Apparently require dynamically loaded data but do not know how to get it! (hint: payload probably malformed?)','error',_me);
          fnLoadComplete();
        }
      },

      revealAllBranches: function() {
        this.revealAllElements('ygtvtable');
        this.hiddenBranches = {};
      },

/** return a boolean indicating if the module is in a fit state to be bookmarked
 * @method isStateValid
 * @return {boolean} <strong>false</strong>, must be over-ridden by derived types that can handle their separate cases
 */
      isStateValid: function() {
        if ( this.obj.data ) { return true; } // TODO is this good enough...? Use _needsParse...?
        return false;
      },

/** return a string with the state of the object. The object must be capable of receiving this string and setting it's state from it
 * @method getState
 * @return {string} the state of the object, in any reasonable format that conforms to the navigator's parser
 */
      getState: function() {
        var state = '',
            m = this.meta, i, key, seg, s;
        if ( !m ) { return state; }
        if ( m.sort && m.sort.field ) {
          state = 'sort{'+this.friendlyName(m.sort.field)+' '+m.sort.dir+' '+m.sort.type+'}';
        }
        if ( m.hide ) {
          seg = '';
          i = 0;
          for (key in m.hide) {
            if ( i++ ) { seg += ' '; }
            seg += this.friendlyName(key);
          }
          if ( seg ) { state += 'hide{'+seg+'}'; }
        }
        if ( this.ctl.Filter ) { // TODO this ought really to be a state-plugin for the filter, rather than calling it directly?
          seg = this.ctl.Filter.asString();
          if ( seg ) { state += 'filter{'+seg+'}'; }
        }
        if ( typeof(this.specificState) == 'function' )
        {
          seg = '';
          i = 0;
          s = this.specificState();
          for (key in s) {
            if ( i++ ) { seg += ' '; }
            seg += key+'='+s[key];
          }
          if ( seg ) { state += 'specific{'+seg+'}'; }
        }
        return state;
      },

      setState: function(state) {
        if ( state.specific ) {
          this.specificState(state.specific);
        }
      }

    };
  };
  YAHOO.lang.augmentObject(this,_construct(),true);
  return this;
}

PHEDEX.TreeView.ContextMenu = function(obj,args) {
    var p = args.payload;
    if ( !p.config ) { p.config={}; }
    if ( !p.typeNames ) { p.typeNames=[]; }
    p.typeNames.push('treeview');
    if ( !p.config.trigger ) { p.config.trigger = obj.dom.content };
    var fn = function(opts,el) {
      var elPhedex = obj.locateNode(el.target);
      var elClass = obj.getPhedexFieldClass(elPhedex);
      obj.meta.hide[elClass] = 1;
      obj.hideFieldByClass(elClass);
    };
    PHEDEX.Component.ContextMenu.Add('treeview','Hide This Field', fn);

    return {
//    Context-menu handlers: onContextMenuBeforeShow allows to (re-)build the menu based on the element that is clicked.
      onContextMenuBeforeShow: function(target, typeNames) {
        var classes, tgt,
            isHeader, treeMatch, label,
            payload = {};
        tgt = obj.locateNode(target);
        if ( !tgt ) { return; }
        if      ( YuD.hasClass(tgt,'phedex-tnode-header') ) { isHeader = true; }
        else if ( YuD.hasClass(tgt,'phedex-tnode-field' ) ) { isHeader = false; }
        else    { return; }

//      Get the array of MenuItems for the CSS class name from the "oContextMenuItems" map.
        classes = tgt.className.split(" ");

//      Highlight the <tr> element in the table that was the target of the "contextmenu" event.
        YuD.addClass(tgt, "phedex-core-selected");
        label = tgt.textContent;

        treeMatch = /^phedex-tree-/;
        for (var i in classes) {
          if ( classes[i].match(treeMatch) ) {
          log('found '+classes[i]+' to key new menu entries','info',obj.me);
          if ( !isHeader && obj._cfg.contextArgs[classes[i]] ) {
            for(var j in obj._cfg.contextArgs[classes[i]]) {
              typeNames.push(obj._cfg.contextArgs[classes[i]][j]);
            }
          }
        }
      }
      return typeNames;
    },

    onContextMenuHide: function(target) {
      var tgt = obj.locateNode(target);
      if ( tgt ) {
        YuD.removeClass(tgt, "phedex-core-selected");
      }
    },

    onContextMenuClick: function(p_sType, p_aArgs, p_TreeView) {
//    Based on http://developer.yahoo.com/yui/examples/menu/treeviewcontextmenu.html
      log('ContextMenuClick for '+obj.me,'info','treeview');
      var target = this.contextEventTarget,
          node = obj.locateBranch(target);
      if ( !node ) {
        this.cancel();
        return;
      }
      var label = p_aArgs[0].explicitOriginalTarget.textContent,
          task  = p_aArgs[1],
          opts  = {};
      if ( node.payload ) {
        opts = node.payload.opts;
      }
      log('ContextMenu: '+'"'+label+'" for '+obj.me+' ('+opts.selected_node+')','info','treeview');
      if (task) {
        task.value.fn(opts, {container:p_TreeView, node:node, target:target, obj:obj});
      }
    }
  };
}

PHEDEX.TreeView.Resize = function(sandbox,args) {
  var obj  = args.payload.obj,
      _sbx = sandbox,
      elList = YuD.getElementsByClassName('phedex-tnode-header',null,obj.el);
  for (var i in elList)
  {
    var el = elList[i],
        elResize = new YAHOO.util.Resize(el,{ handles:['r'] }); // , draggable:true }); // draggable is cute if I can make it work properly!
    elResize.payload = el;
    elResize.subscribe('endResize',function(ev) {
// find the class that is being resized, update the spec for that class, and rebuild the nodes that are affected by the change.
      var tgt = obj.locateHeader(YuE.getTarget(ev).payload),
          elList = obj.locatePartnerFields(tgt);
     for (var i in elList ) { elList[i].style.width = tgt.style.width; }
      obj.markOverflows();
      var el = obj.locateNode(tgt),
          className = obj.getPhedexFieldClass(el),
          f = obj._cfg.formats[className];
      f.width = tgt.style.width;
      var hdr = obj.locateBranch(tgt);
      for (var i in elList) {
        var node = obj.locateBranch(elList[i]);
        var el1 = PxU.makeNode(node.data.spec,node.data.values);
        node.label = el1.innerHTML;
      }
    });
  }

  _construct = function() {
    return {
      doResize: function() {
//      After expanding, branches need resizing again...
        var className, elList;
        for (className in obj._cfg.classes) {
          elList = YuD.getElementsByClassName(className,null,obj.dom.body);
          for (var i in elList) {
            if ( elList[i].style.width == obj._cfg.formats[className].width ) { break; }
            elList[i].style.width = obj._cfg.formats[className].width;
          }
        }
        obj.markOverflows();
      },

      _init: function() {
        var moduleHandler = function(o) {
          return function(ev,arr) {
            var action = arr[0];
            if ( action && o[action] && typeof(o[action]) == 'function' ) {
              o[action](arr[1]);
            }
          }
        }(this);
        _sbx.listen(obj.id,moduleHandler);
      },
    };
  }
  YAHOO.lang.augmentObject(this,_construct(this),true);
  this._init(args);
  return this;
}

PHEDEX.TreeView.Sort = function(sandbox,args) {
  var _sbx = sandbox,
      obj = args.payload.obj;
  _construct = function() {
    return {
      execute: function(className,type,dir) {
//      node is a tree-node that needs to be sorted, along with its siblings.
//      className is the class to use as the sort-key. If not given, look to see if a default is already set for this group
//      sortFn is the actual sorting function, either passed or taken from set defaults
        var sortFn = PxU.Sort[type][dir],
            index, parent, children, f, i, j,
            map, indices, elList,
            nodes = {}, node;

//      locate all fields of the target-type, find their parents, and sort all children of each parent. This may not be cheap
//      operation, I have to look up all the elements of this CSS class, then get the node they are in, then the parents,
//      make a unique list of the parents, and sort each of them. I can gain something by looking up only every other node,
//      because that way I may miss a parent with a single child, but single-children are already sorted anyway.
//      Also, skip the first element, because that will be the header, which can be ignored
        elList = YuD.getElementsByClassName(className,null,obj.el);
        j = elList.length;
        for (i=1; i<j; i+=2) {
          node = obj.locateBranch(elList[i]);
          parent = node.parent;
          nodes[parent.index] = parent;
        }

        for (j in nodes) {
          parent = nodes[j];
          children = parent.children;
          node = children[0];
          if ( !nodes ) { continue; }
          for (i in node.data.spec.format) {
            f = node.data.spec.format[i];
            if ( f.className == className ) { index = i; break; }
          }
          if ( !index ) {
            log('cannot identify class-type','error','treeview');
            return;
          }

          map = [];
          indices = [];
          for (i in children)
          {
            elList = YuD.getElementsByClassName(className,null,children[i].getEl());
            if ( elList.length ) {
              map.push( {node:children[i], value:children[i].data.values[index]} );
              indices.push( i );
            }
          }
          map.sort(function(a,b){ return sortFn(a.value,b.value); });
          for (i in map) {
            parent.children[indices[i]] = map[i].node;
          }
        }

        obj.tree.render();
//      Rendering the tree resets the classNames of the elements, because it uses the node innerHTML instead of the DOM. Hence this comes here, after the render!
        YuD.getElementsByClassName('phedex-sorted',null,obj.dom.header,function(element) {
          YuD.removeClass(element,'phedex-sorted');
        });
        YuD.getElementsByClassName(className,null,obj.el,function(element) {
          YuD.addClass(element,'phedex-sorted');
        });

//      add a visual indicator that the module has been sorted
        var s = obj.dom.sorted, a;
        if ( !s ) {
          obj.dom.sorted = s = PxU.makeChild(obj.dom.control,'span');
          s.innerHTML = 'S';
          s.className = 'phedex-sorted';
          s.title = 'This is a visual marker to show that the tree has been sorted, in case the sorted field is currently hidden from display';
        }

       for (i in obj.hiddenBranches) {
//       I have to look up the ancestor again, because re-rendering the tree makes the DOM-reference no longer valid if I cached it.
         var elAncestor = YuD.getAncestorByClassName(document.getElementById(i),'ygtvtable');
         YuD.addClass(elAncestor,'phedex-invisible');
       }

        obj.meta.sort.type = type;
        obj.meta.sort.dir  = dir;
        _sbx.notify(obj.id, 'updateHistory');
      },

      prepare: function(el,type,dir) {
//     simply unpack the interesting bits and feed it to the object
        var obj    = el.obj,
            target = obj.locateNode(el.target),
            field  = obj.getPhedexFieldClass(target),
            s      = obj.meta.sort;
        if ( !s ) { s = obj.meta.sort = {}; }
        s.field = field;
        s.dir   = dir;
        s.type  = type;
        this.execute(field,type,dir);
      },

      doSort: function() {
        var s = obj.meta.sort;
        if ( !s )       { return; } // no sort-column defined...
        if ( !s.field ) { return; } // no sort-column defined...
        this.execute(s.field,s.type,s.dir);
      },

      _init: function() {
        try {
          var x = function(o) {
//          strictly speaking, I should not call the context-menu directly here, in case it isn't loaded yet. However, treeview depends on it, so
//          that should not be a problem. For now, the try-catch block will suffice...
            PHEDEX.Component.ContextMenu.Add('sort-files','Sort Files Ascending', function(opts,el) { o.prepare(el,'files',  'asc' ); });
            PHEDEX.Component.ContextMenu.Add('sort-files','Sort Files Descending',function(opts,el) { o.prepare(el,'files',  'desc'); });
            PHEDEX.Component.ContextMenu.Add('sort-bytes','Sort Bytes Ascending', function(opts,el) { o.prepare(el,'bytes',  'asc' ); });
            PHEDEX.Component.ContextMenu.Add('sort-bytes','Sort Bytes Descending',function(opts,el) { o.prepare(el,'bytes',  'desc'); });
            PHEDEX.Component.ContextMenu.Add('sort-alpha','Sort Ascending',       function(opts,el) { o.prepare(el,'alpha',  'asc' ); });
            PHEDEX.Component.ContextMenu.Add('sort-alpha','Sort Descending',      function(opts,el) { o.prepare(el,'alpha',  'desc'); });
            PHEDEX.Component.ContextMenu.Add('sort-num',  'Sort Ascending',       function(opts,el) { o.prepare(el,'numeric','asc' ); });
            PHEDEX.Component.ContextMenu.Add('sort-num',  'Sort Descending',      function(opts,el) { o.prepare(el,'numeric','desc'); });
          }(this);
        } catch(ex) { log(ex,'error',obj.me); };

        var moduleHandler = function(o) {
          return function(ev,arr) {
            var action = arr[0];
            if ( action && o[action] && typeof(o[action]) == 'function' ) {
              o[action](arr[1]);
            }
          }
        }(this);
        _sbx.listen(obj.id,moduleHandler);
      },
    };
  }
  YAHOO.lang.augmentObject(this,_construct(this),true);
  this._init(args);
  return this;
}

//   PHEDEX.Event.onGlobalFilterCancelled.subscribe( function(obj) {
//     return function() {
//       log('onGlobalFilterCancelled:'+obj.me(),'info','treeview');
//       YuD.removeClass(obj.ctl.filter.el,'phedex-core-control-widget-applied');
//       obj.revealAllBranches();
//       obj.filter.Reset();
//     }
//   }(that));
//
//   PHEDEX.Event.onGlobalFilterValidated.subscribe( function(obj) {
//     return function(ev,arr) {
//       var args = arr[0];
//       if ( ! obj.filter.args ) { obj.filter.args = []; }
//       for (var i in args) {
// 	   obj.filter.args[i] = args[i];
//       }
//       obj.applyFilter(arr[0]);
//     }
//   }(that));

/** This class is invoked by PHEDEX.Module to create the correct handler for datatable mouse-over events.
 * @namespace PHEDEX.DataTable
 * @class MouseOver
 * @param sandbox {PHEDEX.Sandbox} reference to a PhEDEx sandbox object (unused)
 * @param args {object} reference to an object that specifies details of how the control should operate. Only <strong>args.payload.obj.dataTable</strong> is used, to subscribe to the <strong>onRowMouseOver</strong> and >strong>onRowMouseOut</strong> events.
 */
PHEDEX.TreeView.MouseOver = function(sandbox,args) {
  var obj = args.payload.obj;
  function mouseOverHandler(e) {
//  get the resolved (non-text node) target:
    var elTarget = YuE.getTarget(e),
        el = obj.locateNode(elTarget),
        action, className, class_alt, elList, i;
    if ( ! el ) { return; }
    className = 'phedex-tnode-highlight';
    class_alt  = 'phedex-tnode-highlight-associated';
    if ( e.type == 'mouseover' ) {
      action = YuD.addClass;
    } else {
      action = YuD.removeClass;
    }
    elList = obj.locatePartnerFields(el);
    for (i in elList )
    {
      action(elList[i],class_alt);
    }
    action(el,className);
  }
  YuE.on(obj.dom.content, "mouseover", mouseOverHandler);
  YuE.on(obj.dom.content, "mouseout",  mouseOverHandler);
  YuE.on(obj.dom.extra,   "mouseover", mouseOverHandler);
  YuE.on(obj.dom.extra,   "mouseout",  mouseOverHandler);
}

PHEDEX.TreeView.Filter = function(sandbox,obj) {
  var _sbx = sandbox;
  _construct = function() {
    return {
        /**
        * Resets the filter in the module.
        * @method resetFilter
        * @param arg {Object} The array of column keys with user entered filter values.
        * @private
        */
        resetFilter: function(args) {
// TODO This is a big hammer. Would be better to cache the original tree and work with that...
          this.applyFilter({});
        },

      _init: function() {
        var moduleHandler = function(o) {
          return function(ev,arr) {
            var action = arr[0];
            if ( action && o[action] && typeof(o[action]) == 'function' ) {
              o[action](arr[1]);
            }
          }
        }(this);
        _sbx.listen(obj.id,moduleHandler);
      },

      applyFilter: function(args) {
        this._applyFilter(args);
      },

      _applyFilter: function(args) {
//      First, reveal any filtered branches, in case the filter has changed (as opposed to being created)
        obj.revealAllBranches();
        var elParents={}, i, status, key, fValue, negate, elId, tNode, className, kValue, elParent, elAncestor;
        if ( !args ) { args = this.args; }
        for (key in args) {
          fValue = args[key].values;
          negate = args[key].negate;
          for (elId in obj._cfg.textNodeMap) {
            tNode = obj._cfg.textNodeMap[elId];
            if ( tNode.data.spec.className == 'phedex-tnode-header' ) { continue; }
            for (i in tNode.data.spec.format) {
              className = tNode.data.spec.format[i].className;
              if ( className != key ) { continue; }
              kValue = tNode.data.values[i];
              if ( args[key].preprocess ) { kValue = args[key].preprocess(kValue); }
              status = this.Apply[this.meta._filter.fields[key].type](fValue,kValue);
              if ( args[key].negate ) { status = !status; }
              if ( !status ) { // Keep the element if the match succeeded!
                tNode.collapse();
                elAncestor = YuD.getAncestorByClassName(elId,'ygtvtable');
                YuD.addClass(elAncestor,'phedex-invisible');
                obj.hiddenBranches[elId] = 1;
                this.count++;
                if ( tNode.parent ) {
                  if ( tNode.parent.labelElId ) { elParents[tNode.parent.labelElId] = 1; }
                }
              }
              break;
            }
          }
        }
        for (elParent in elParents) {
          ancestor = YuD.getAncestorByClassName(elParent,'ygtvtable');
          YuD.addClass(ancestor,'phedex-core-control-widget-applied');
        }
        _sbx.notify(obj.id,'updateHistory');
        return this.count;
      },

      doFilter: function(node) {
        obj._applyFilter();
      },
    }
  };
  YAHOO.lang.augmentObject(this,_construct(this),true);
  this._init();
  return this;
};

log('loaded...','info','treeview');
