PHEDEX.namespace('Global');

PHEDEX.Global.Filter=function(el) {
  YAHOO.lang.augmentObject(this,PHEDEX.Base.Object(this));
  this.me = function() { return 'PHEDEX.Global.Filter'; }
  this.widgets = [];
//   this.logClass = function() { return 'Global'; }

  this.fillGlobalFilter = function(el) {
    el.innerHTML = 'this is the filter-panel div';
  }
//   var _initGlobalFilter = function(el) {
//     var filterdiv = PxU.makeChild(el, 'div', { id:'phedex-nav-filter', className:'phedex-nav-component phedex-nav-filter' });
//     var input = PxU.makeChild(filterdiv, 'input',
// 			      { id: 'phedex-nav-filter-input', className:'phedex-nav-filter-input',
// 				type: 'text' });
//     var filterpaneldiv = PxU.makeChild(el, 'div', { id:'phedex-nav-filter-panel', className:'phedex-nav-component phedex-nav-link' /*, innerHTML:'Filter'*/ });
  this.filterPanel = document.createElement('div');
  this.filterPanel.className = 'phedex-global-filter phedex-visible phedex-widget-selector phedex-box-turquoise';
  document.body.appendChild(this.filterPanel);
  document.getElementById(el).innerHTML='';
  YAHOO.lang.augmentObject(this,PHEDEX.Core.Filter(this));
  this.onHideFilter  = new YAHOO.util.CustomEvent("onHideFilter", this, false, YAHOO.util.CustomEvent.LIST);
  this.ctl.filter = new PHEDEX.Core.Control({text:'Global Filter',
                                            payload:{render:el, //filterpaneldiv,
					      target:this.filterPanel,
                                              fillFn:this.filter.Build, //fillGlobalFilter,
                                              obj:this,
                                              animate:false,
                                              hover_timeout:200,
                                              onHideControl:this.onHideFilter
//                                              onShowControl:null
                                            }
                                          });
//   };
  PHEDEX.Event.onFilterCancel.subscribe( function(obj) {
    return function() {
      YAHOO.log('onFilterCancel:'+obj.me(),'info','Global');
      obj.ctl.filter.Hide();
      YAHOO.util.Dom.removeClass(obj.ctl.filter.el,'phedex-core-control-widget-applied');
      obj.filter.Reset();
    }
  }(this));

// TODO This is duplicate code with PHEDEX.Core.Widget. It could be abstracted further, only the 'Global' changes between the two versions
  PHEDEX.Event.onFilterAccept.subscribe( function(obj) {
    return function() {
      YAHOO.log('onFilterAccept:'+obj.me(),'info','Global');
      obj.filter.Parse();
    }
  }(this));
//   PHEDEX.Event.onFilterValidated.subscribe( function(obj) {
//     return function(ev,arr) {
//       YAHOO.log('onFilterValidated:'+obj.me(),'info','Global');
//       obj.ctl.filter.Hide();
//       obj.applyFilter(arr[0]);
//     }
//   }(this));
  PHEDEX.Event.onFilterDefinition.subscribe( function(obj) {
    return function(ev,arr) {
debugger;
      var args = arr[0];
      var widget = arr[1];
      if ( obj.widgets[widget] ) { return; } // already seen this one...
      if ( widget == obj.me() ) { return; } // don't process my own input twice!
      else			{ obj.filter.init(args); } // copy the initialisation arguments
      YAHOO.log('onFilterDefinition:'+widget,'info','Global');
      obj.widgets[widget] = [];
      for (var i in args) {
	for (var j in args[i]) {
	  obj.widgets[widget][j] = i; // args[i][j];
	}
      }
    }
  }(this));

  PHEDEX.Event.onFilterValidated.subscribe( function(obj) {
    return function(ev,arr) {
      var str = obj.filter.asString();
      YAHOO.log('onFilterValidated:'+obj.me()+' '+str,'info','Global');
      var el = document.getElementById('phedex-nav-filter-input');
      el.value = str;
      obj.ctl.filter.Hide();
    }
  }(this));

  this.onHideFilter.subscribe(function() {
      this.filter.destroy();
      this.ctl.filter.setApplied(this.filter.isApplied());
    });

  return this;
};
