(()=>{"use strict";var e={792:()=>{},752:function(e,t,i){var s,r,n,o,a,l,d,c=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},h=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};Object.defineProperty(t,"__esModule",{value:!0});const f=i(826),u=i(301),p=i(935),w=i(495),m=i(882);class v extends f.View{constructor(e){super("div"),this.elem.classList.add("profile-view");const t=(0,m.createElement)("h1");t.innerText=e.op.name,this.elem.appendChild(t),this.appendView(new p.OpNodeFlameGraphView(e)),this.appendView(new w.OpNodeTreeView(e))}}class E extends f.View{constructor(e,t){super("main"),s.add(this),r.set(this,void 0),n.set(this,void 0),o.set(this,void 0),a.set(this,void 0),c(this,r,e,"f"),c(this,n,(0,m.createElement)("ul","profile-list"),"f"),c(this,o,(0,m.createElement)("div","profile-container"),"f"),this.elem.appendChild(h(this,n,"f")),this.elem.appendChild(h(this,o,"f"));for(const e of t)if(e){const t=(0,m.createElement)("li");t.addEventListener("click",(i=>{for(const e of h(this,n,"f").children)e.classList.remove("selected");t.classList.add("selected"),h(this,s,"m",d).call(this,e)})),t.innerText=h(this,s,"m",l).call(this,e),h(this,n,"f").appendChild(t)}}}r=new WeakMap,n=new WeakMap,o=new WeakMap,a=new WeakMap,s=new WeakSet,l=function(e){function t(t){e.endsWith(t)&&(e=e.substring(0,e.length-t.length))}var i;return i="labml_nn.",e.startsWith(i)&&(e=e.substring(i.length)),t(".bin"),t(".experiment"),e},d=function(e){h(this,r,"f").loadProfile(e,(e=>{var t;null===(t=h(this,a,"f"))||void 0===t||t.dispose(),c(this,a,void 0,"f");const i=new u.BinaryOpNodeReader(e).readOpNode();c(this,a,new v(i),"f"),h(this,o,"f").appendChild(h(this,a,"f").elem)}))};class y{constructor(){this.loadProfileList()}loadProfileList(){const e=new XMLHttpRequest;e.open("GET","/profiles/profiles.json"),e.responseType="json",e.onload=t=>{4===e.readyState&&200===e.status&&document.body.appendChild(new E(this,e.response).elem)},e.send(null)}loadProfile(e,t){function i(e){console.error("unable to load profile: %O",e)}e=`/profiles/${e}`;const s=new XMLHttpRequest;s.open("GET",e,!0),s.responseType="arraybuffer",s.onload=r=>{try{if(4!==s.readyState)return;200===s.status?t(s.response):i(`HTTP ${s.status} ${s.statusText}: GET: ${e}`)}catch(e){i(e)}},s.onerror=e=>i("XMLHttpRequest onerror"),s.send(null)}}window.addEventListener("DOMContentLoaded",(e=>{const t=window;t._opstractorFrontendSession||(t._opstractorFrontendSession=new y)}))},301:function(e,t){var i,s,r,n,o,a,l,d,c,h,f,u=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},p=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};Object.defineProperty(t,"__esModule",{value:!0}),t.BinaryOpNodeReader=t.OpNode=t.Op=void 0;class w{constructor(e,t,i){this.handle=e,this.name=t,this.schema=i}}t.Op=w;class m{constructor(e,t,i,s){this.op=e,this.invocationCount=t,this.cumlTotalDurationNs=i,this.children=s}sort(e){return new m(this.op,this.invocationCount,this.cumlTotalDurationNs,this.children.map((t=>t.sort(e))).sort(e))}}t.OpNode=m,t.BinaryOpNodeReader=class{constructor(e){i.add(this),s.set(this,void 0),r.set(this,void 0),n.set(this,void 0),o.set(this,void 0),a.set(this,void 0),u(this,s,e,"f"),u(this,r,new DataView(p(this,s,"f")),"f"),u(this,n,0,"f"),u(this,o,new TextDecoder("utf8"),"f"),u(this,a,new Map,"f")}readOpNode(){return new m(p(this,i,"m",h).call(this),p(this,i,"m",d).call(this),1e3*p(this,i,"m",d).call(this),p(this,i,"m",f).call(this))}},s=new WeakMap,r=new WeakMap,n=new WeakMap,o=new WeakMap,a=new WeakMap,i=new WeakSet,l=function(){const e=p(this,r,"f").getUint16(p(this,n,"f"),!0);return u(this,n,p(this,n,"f")+2,"f"),e},d=function(){const e=p(this,r,"f").getUint32(p(this,n,"f"),!0);return u(this,n,p(this,n,"f")+4,"f"),e},c=function(){const e=p(this,i,"m",l).call(this);if(0==e)return null;const t=new DataView(p(this,s,"f"),p(this,n,"f"),e),r=p(this,o,"f").decode(t);return u(this,n,p(this,n,"f")+e,"f"),r},h=function(){const e=p(this,i,"m",l).call(this),t=e>>1;if(0==(1&e)){const e=p(this,i,"m",c).call(this);if(!e)throw new Error("unexpected end of data");p(this,a,"f").set(t,new w(t,e,p(this,i,"m",c).call(this)))}const s=p(this,a,"f").get(t);if(!s)throw new Error(`Op with handle '${t}' not in table`);return s},f=function(){const e=p(this,i,"m",l).call(this),t=[];for(let i=0;i<e;i++)t.push(this.readOpNode());return t}},935:function(e,t,i){var s,r,n=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},o=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};Object.defineProperty(t,"__esModule",{value:!0}),t.OpNodeFlameGraphView=void 0;const a=i(826),l=i(882),d=["enumerate(DataLoader)#_SingleProcessDataLoaderIter.__next__"];function c(e){return{opNode:e,name:e.op.name,value:e.cumlTotalDurationNs,children:d.indexOf(e.op.name)>=0?void 0:e.children.map((e=>c(e)))}}class h extends a.View{constructor(e){super("div"),s.set(this,void 0),r.set(this,void 0),n(this,s,e,"f");const t=window.flamegraph(),i=window.d3.tip().attr("class","d3-flame-graph-tip").html((e=>{var t;const[i,s]=(0,l.formatDuration)(e.data.value);return void 0===i?e.data.name:`${null!==(t=e.data.opNode.op.schema)&&void 0!==t?t:e.data.name}: ${i.toLocaleString(void 0,{maximumFractionDigits:1})}${s}`}));t.tooltip(i),window.d3.select(this.elem).datum(c(o(this,s,"f"))).call(t),n(this,r,(()=>{var e;const i=this.elem.clientWidth;null===(e=this.elem.querySelector("svg.d3-flame-graph"))||void 0===e||e.setAttribute("width",`${i}`),t.width(i),t.resetZoom()}),"f"),window.requestAnimationFrame(o(this,r,"f")),window.addEventListener("resize",o(this,r,"f")),window.addEventListener("DOMContentLoaded",o(this,r,"f"))}dispose(){window.removeEventListener("resize",o(this,r,"f")),window.removeEventListener("DOMContentLoaded",o(this,r,"f")),super.dispose()}}t.OpNodeFlameGraphView=h,s=new WeakMap,r=new WeakMap},495:function(e,t,i){var s,r,n=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},o=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};Object.defineProperty(t,"__esModule",{value:!0}),t.OpNodeTreeView=void 0;const a=i(997),l=i(882);class d{constructor(e){s.set(this,void 0),r.set(this,void 0),n(this,s,e,"f"),n(this,r,e,"f")}getChildRowCount(e){return(null!=e?e:o(this,r,"f")).children.length}getChildRow(e,t){return(null!=t?t:o(this,r,"f")).children[e]}getCellViewElem(e,t){switch(t.id){case"name":return e.op.name;case"count":return e.invocationCount.toLocaleString();case"duration":const t=(0,l.createSpanElement)(null,"duration"),[i,s]=(0,l.formatDuration)(e.cumlTotalDurationNs);if(i&&s){const e=(0,l.createSpanElement)(i.toLocaleString(void 0,{maximumFractionDigits:1}),"value"),r=(0,l.createSpanElement)(s,"unit");t.appendChild(e),t.appendChild(r)}return t;case"schema":return(0,l.createSpanElement)(e.op.schema,"schema")}throw new Error(`unbound column id ${t.id}`)}sort(e,t){n(this,r,t?o(this,s,"f").sort(((i,s)=>{let r=0;switch(e.id){case"count":r=i.invocationCount-s.invocationCount;break;case"duration":r=i.cumlTotalDurationNs-s.cumlTotalDurationNs}return"desc"===t?-1*r:r})):o(this,s,"f"),"f")}}s=new WeakMap,r=new WeakMap;class c extends a.TreeView{constructor(e){super(new d(e),{id:"name",title:"Name",holdsExpander:!0},{id:"count",title:"Count",isSortable:!0},{id:"duration",title:"Duration",isSortable:!0},{id:"schema",title:"Operator Schema"})}}t.OpNodeTreeView=c},997:function(e,t,i){var s,r,n,o,a,l,d,c,h,f,u=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},p=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};Object.defineProperty(t,"__esModule",{value:!0}),t.TreeView=void 0;const w=i(826),m=i(882);class v extends w.View{constructor(e,...t){super("table"),s.add(this),r.set(this,void 0),n.set(this,void 0),o.set(this,void 0),a.set(this,void 0),this.elem.classList.add("tree-view"),u(this,r,e,"f"),u(this,n,[],"f"),u(this,o,new m.BidiMap,"f"),u(this,a,(0,m.createElement)("thead"),"f"),this.elem.appendChild(p(this,a,"f")),p(this,s,"m",l).call(this,t),this.reloadData()}reloadData(){p(this,s,"m",d).call(this);for(let e=0,t=p(this,r,"f").getChildRowCount();e<t;e++){const t=p(this,r,"f").getChildRow(e);if(t){const e=p(this,s,"m",c).call(this,t,0);p(this,o,"f").set(t,e),this.elem.appendChild(e)}}}}t.TreeView=v,r=new WeakMap,n=new WeakMap,o=new WeakMap,a=new WeakMap,s=new WeakSet,l=function(e){var t;for(const i of e){const e=(0,m.createElement)("th",`col-id-${i.id}`);e.appendChild((null!==(t=i.headerElemFactory)&&void 0!==t?t:e=>(0,m.createSpanElement)(i.title))(i));const o={definition:i,thElem:e};p(this,a,"f").appendChild(e),p(this,n,"f").push(o),p(this,r,"f").sort&&i.isSortable&&(e.classList.add("sortable"),e.addEventListener("click",(e=>p(this,s,"m",f).call(this,o))))}},d=function(){var e;for(const[t,i]of p(this,o,"f"))null===(e=i.parentElement)||void 0===e||e.removeChild(i);p(this,o,"f").clear()},c=function(e,t){const i=(0,m.createElement)("tr");for(let o=0;o<p(this,n,"f").length;o++){const a=p(this,n,"f")[o],l=(0,m.createElement)("td",`col-id-${a.definition.id}`);for(let e=0;e<t;e++)l.appendChild((0,m.createElement)("span","indent"));if(a.definition.holdsExpander){l.classList.add("expander-column");const n=(0,m.createElement)("span","expander");p(this,r,"f").getChildRowCount(e)>0&&(l.classList.add("expandable"),l.addEventListener("click",(r=>p(this,s,"m",h).call(this,e,i,t)))),l.appendChild(n)}const d=p(this,r,"f").getCellViewElem(e,a.definition);"string"==typeof d?l.appendChild((0,m.createSpanElement)(d)):d&&l.appendChild(d),i.appendChild(l)}return i},h=function e(t,i,n,a){var l;a||(a=i.classList.toggle("expanded")?"expand":"collapse");let d=i;for(let i=0,h=p(this,r,"f").getChildRowCount(t);i<h;i++){const h=p(this,r,"f").getChildRow(i,t);if(!h)continue;let f=p(this,o,"f").getB(h);f||(f=p(this,s,"m",c).call(this,h,n+1),p(this,o,"f").set(h,f),null===(l=d.parentNode)||void 0===l||l.insertBefore(f,d.nextSibling)),d=f,"expand"===a?f.classList.remove("row-hidden"):(f.classList.add("row-hidden"),f.classList.remove("expanded"),d=p(this,s,"m",e).call(this,h,f,n+1,a))}return d},f=function(e){if(p(this,r,"f").sort){for(const t of p(this,n,"f"))t!==e&&(t.sortOrder=void 0),t.thElem.classList.remove("sort-asc"),t.thElem.classList.remove("sort-desc");switch(e.sortOrder){case void 0:case null:e.sortOrder="desc",e.thElem.classList.add("sort-desc");break;case"desc":e.sortOrder="asc",e.thElem.classList.add("sort-asc");break;case"asc":e.sortOrder=void 0;break;default:throw new TypeError(`invalid sort order: ${e.sortOrder} for column ${e.definition.id}`)}p(this,r,"f").sort(e.definition,e.sortOrder),this.reloadData()}}},882:function(e,t){var i,s,r=this&&this.__classPrivateFieldSet||function(e,t,i,s,r){if("m"===s)throw new TypeError("Private method is not writable");if("a"===s&&!r)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===s?r.call(e,i):r?r.value=i:t.set(e,i),i},n=this&&this.__classPrivateFieldGet||function(e,t,i,s){if("a"===i&&!s)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!s:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?s:"a"===i?s.call(e):s?s.value:t.get(e)};function o(e,...t){const i=document.createElement(e);return i.classList.add(...t),i}Object.defineProperty(t,"__esModule",{value:!0}),t.BidiMap=t.createSpanElement=t.createElement=t.formatDuration=void 0,t.formatDuration=function(e){if(void 0===e||0===e)return[void 0,void 0];const t=[0,1e3,1e6,1e9];let i=Math.floor(Math.log10(e)/3);return(i<0||i>t.length)&&(i=t.length-1),[e/t[i],["ns","µs","ms","s"][i]]},t.createElement=o,t.createSpanElement=function(e,...t){const i=o("span",...t);return e&&(i.innerText=e),i};class a{constructor(){i.set(this,void 0),s.set(this,void 0),r(this,i,new Map,"f"),r(this,s,new Map,"f")}set(e,t){if(void 0===e||void 0===t||null===e||null===t)throw new TypeError("a and b parameters must be non-null/undefined");n(this,i,"f").set(e,t),n(this,s,"f").set(t,e)}get(e){let t=this.getA(e),r=this.getB(e);return void 0===t&&void 0===r?[void 0,void 0]:(void 0===t?r&&(t=n(this,s,"f").get(r)):void 0===r&&(r=n(this,i,"f").get(t)),[t,r])}getA(e){return n(this,s,"f").get(e)}getB(e){return n(this,i,"f").get(e)}delete(e){let[t,r]=this.get(e);t&&n(this,i,"f").delete(t),r&&n(this,s,"f").delete(r)}clear(){n(this,i,"f").clear(),n(this,s,"f").clear()}*[(i=new WeakMap,s=new WeakMap,Symbol.iterator)](){for(const e of n(this,i,"f"))yield e}}t.BidiMap=a},826:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.View=void 0;const s=i(882);t.View=class{constructor(e,...t){this.elem=(0,s.createElement)(e,...t)}appendView(e){this.elem.appendChild(e.elem)}dispose(){var e,t;null===(t=null===(e=this.elem)||void 0===e?void 0:e.parentNode)||void 0===t||t.removeChild(this.elem)}}}},t={};function i(s){var r=t[s];if(void 0!==r)return r.exports;var n=t[s]={exports:{}};return e[s].call(n.exports,n,n.exports,i),n.exports}i(752),i(792)})();