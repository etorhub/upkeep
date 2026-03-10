function f(o,e,t,r){var i=arguments.length,s=i<3?e:r===null?r=Object.getOwnPropertyDescriptor(e,t):r,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(o,e,t,r);else for(var c=o.length-1;c>=0;c--)(n=o[c])&&(s=(i<3?n(s):i>3?n(e,t,s):n(e,t))||s);return i>3&&s&&Object.defineProperty(e,t,s),s}typeof SuppressedError=="function"&&SuppressedError;const B=globalThis,K=B.ShadowRoot&&(B.ShadyCSS===void 0||B.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),se=new WeakMap;let ne=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(K&&e===void 0){const r=t!==void 0&&t.length===1;r&&(e=se.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&se.set(t,e))}return e}toString(){return this.cssText}};const Qe=o=>new ne(typeof o=="string"?o:o+"",void 0,Z),O=(o,...e)=>{const t=o.length===1?o[0]:e.reduce((r,i,s)=>r+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+o[s+1],o[0]);return new ne(t,o,Z)},Xe=(o,e)=>{if(K)o.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const r=document.createElement("style"),i=B.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=t.cssText,o.appendChild(r)}},ae=K?o=>o:o=>o instanceof CSSStyleSheet?(e=>{let t="";for(const r of e.cssRules)t+=r.cssText;return Qe(t)})(o):o;const{is:et,defineProperty:tt,getOwnPropertyDescriptor:rt,getOwnPropertyNames:it,getOwnPropertySymbols:ot,getPrototypeOf:st}=Object,j=globalThis,ce=j.trustedTypes,nt=ce?ce.emptyScript:"",at=j.reactiveElementPolyfillSupport,D=(o,e)=>o,F={toAttribute(o,e){switch(e){case Boolean:o=o?nt:null;break;case Object:case Array:o=o==null?o:JSON.stringify(o)}return o},fromAttribute(o,e){let t=o;switch(e){case Boolean:t=o!==null;break;case Number:t=o===null?null:Number(o);break;case Object:case Array:try{t=JSON.parse(o)}catch{t=null}}return t}},J=(o,e)=>!et(o,e),de={attribute:!0,type:String,converter:F,reflect:!1,useDefault:!1,hasChanged:J};Symbol.metadata??=Symbol("metadata"),j.litPropertyMetadata??=new WeakMap;let S=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=de){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(e,r,t);i!==void 0&&tt(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){const{get:i,set:s}=rt(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:i,set(n){const c=i?.call(this);s?.call(this,n),this.requestUpdate(e,c,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??de}static _$Ei(){if(this.hasOwnProperty(D("elementProperties")))return;const e=st(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(D("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(D("properties"))){const t=this.properties,r=[...it(t),...ot(t)];for(const i of r)this.createProperty(i,t[i])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[r,i]of t)this.elementProperties.set(r,i)}this._$Eh=new Map;for(const[t,r]of this.elementProperties){const i=this._$Eu(t,r);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const r=new Set(e.flat(1/0).reverse());for(const i of r)t.unshift(ae(i))}else e!==void 0&&t.push(ae(e));return t}static _$Eu(e,t){const r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Xe(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){const r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(i!==void 0&&r.reflect===!0){const s=(r.converter?.toAttribute!==void 0?r.converter:F).toAttribute(t,r.type);this._$Em=e,s==null?this.removeAttribute(i):this.setAttribute(i,s),this._$Em=null}}_$AK(e,t){const r=this.constructor,i=r._$Eh.get(e);if(i!==void 0&&this._$Em!==i){const s=r.getPropertyOptions(i),n=typeof s.converter=="function"?{fromAttribute:s.converter}:s.converter?.fromAttribute!==void 0?s.converter:F;this._$Em=i;const c=n.fromAttribute(t,s.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(e,t,r,i=!1,s){if(e!==void 0){const n=this.constructor;if(i===!1&&(s=this[e]),r??=n.getPropertyOptions(e),!((r.hasChanged??J)(s,t)||r.useDefault&&r.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:s},n){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),s!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,s]of this._$Ep)this[i]=s;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[i,s]of r){const{wrapped:n}=s,c=this[i];n!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,s,c)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};S.elementStyles=[],S.shadowRootOptions={mode:"open"},S[D("elementProperties")]=new Map,S[D("finalized")]=new Map,at?.({ReactiveElement:S}),(j.reactiveElementVersions??=[]).push("2.1.2");const Y=globalThis,le=o=>o,W=Y.trustedTypes,he=W?W.createPolicy("lit-html",{createHTML:o=>o}):void 0,ue="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,pe="?"+b,ct=`<${pe}>`,w=document,N=()=>w.createComment(""),U=o=>o===null||typeof o!="object"&&typeof o!="function",Q=Array.isArray,dt=o=>Q(o)||typeof o?.[Symbol.iterator]=="function",X=`[ 	
\f\r]`,H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,fe=/-->/g,_e=/>/g,k=RegExp(`>|${X}(?:([^\\s"'>=/]+)(${X}*=${X}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),me=/'/g,ge=/"/g,ve=/^(?:script|style|textarea|title)$/i,ye=o=>(e,...t)=>({_$litType$:o,strings:e,values:t}),l=ye(1),lt=ye(2),C=Symbol.for("lit-noChange"),_=Symbol.for("lit-nothing"),$e=new WeakMap,A=w.createTreeWalker(w,129);function be(o,e){if(!Q(o)||!o.hasOwnProperty("raw"))throw Error("invalid template strings array");return he!==void 0?he.createHTML(e):e}const ht=(o,e)=>{const t=o.length-1,r=[];let i,s=e===2?"<svg>":e===3?"<math>":"",n=H;for(let c=0;c<t;c++){const a=o[c];let p,u,h=-1,m=0;for(;m<a.length&&(n.lastIndex=m,u=n.exec(a),u!==null);)m=n.lastIndex,n===H?u[1]==="!--"?n=fe:u[1]!==void 0?n=_e:u[2]!==void 0?(ve.test(u[2])&&(i=RegExp("</"+u[2],"g")),n=k):u[3]!==void 0&&(n=k):n===k?u[0]===">"?(n=i??H,h=-1):u[1]===void 0?h=-2:(h=n.lastIndex-u[2].length,p=u[1],n=u[3]===void 0?k:u[3]==='"'?ge:me):n===ge||n===me?n=k:n===fe||n===_e?n=H:(n=k,i=void 0);const $=n===k&&o[c+1].startsWith("/>")?" ":"";s+=n===H?a+ct:h>=0?(r.push(p),a.slice(0,h)+ue+a.slice(h)+b+$):a+b+(h===-2?c:$)}return[be(o,s+(o[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]};class V{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let s=0,n=0;const c=e.length-1,a=this.parts,[p,u]=ht(e,t);if(this.el=V.createElement(p,r),A.currentNode=this.el.content,t===2||t===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=A.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(const h of i.getAttributeNames())if(h.endsWith(ue)){const m=u[n++],$=i.getAttribute(h).split(b),L=/([.?@])?(.*)/.exec(m);a.push({type:1,index:s,name:L[2],strings:$,ctor:L[1]==="."?pt:L[1]==="?"?ft:L[1]==="@"?_t:G}),i.removeAttribute(h)}else h.startsWith(b)&&(a.push({type:6,index:s}),i.removeAttribute(h));if(ve.test(i.tagName)){const h=i.textContent.split(b),m=h.length-1;if(m>0){i.textContent=W?W.emptyScript:"";for(let $=0;$<m;$++)i.append(h[$],N()),A.nextNode(),a.push({type:2,index:++s});i.append(h[m],N())}}}else if(i.nodeType===8)if(i.data===pe)a.push({type:2,index:s});else{let h=-1;for(;(h=i.data.indexOf(b,h+1))!==-1;)a.push({type:7,index:s}),h+=b.length-1}s++}}static createElement(e,t){const r=w.createElement("template");return r.innerHTML=e,r}}function M(o,e,t=o,r){if(e===C)return e;let i=r!==void 0?t._$Co?.[r]:t._$Cl;const s=U(e)?void 0:e._$litDirective$;return i?.constructor!==s&&(i?._$AO?.(!1),s===void 0?i=void 0:(i=new s(o),i._$AT(o,t,r)),r!==void 0?(t._$Co??=[])[r]=i:t._$Cl=i),i!==void 0&&(e=M(o,i._$AS(o,e.values),i,r)),e}class ut{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,i=(e?.creationScope??w).importNode(t,!0);A.currentNode=i;let s=A.nextNode(),n=0,c=0,a=r[0];for(;a!==void 0;){if(n===a.index){let p;a.type===2?p=new I(s,s.nextSibling,this,e):a.type===1?p=new a.ctor(s,a.name,a.strings,this,e):a.type===6&&(p=new mt(s,this,e)),this._$AV.push(p),a=r[++c]}n!==a?.index&&(s=A.nextNode(),n++)}return A.currentNode=w,i}p(e){let t=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}}class I{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=_,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=M(this,e,t),U(e)?e===_||e==null||e===""?(this._$AH!==_&&this._$AR(),this._$AH=_):e!==this._$AH&&e!==C&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):dt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==_&&U(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:r}=e,i=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=V.createElement(be(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(t);else{const s=new ut(i,this),n=s.u(this.options);s.p(t),this.T(n),this._$AH=s}}_$AC(e){let t=$e.get(e.strings);return t===void 0&&$e.set(e.strings,t=new V(e)),t}k(e){Q(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let r,i=0;for(const s of e)i===t.length?t.push(r=new I(this.O(N()),this.O(N()),this,this.options)):r=t[i],r._$AI(s),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const r=le(e).nextSibling;le(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}}class G{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,s){this.type=1,this._$AH=_,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=s,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=_}_$AI(e,t=this,r,i){const s=this.strings;let n=!1;if(s===void 0)e=M(this,e,t,0),n=!U(e)||e!==this._$AH&&e!==C,n&&(this._$AH=e);else{const c=e;let a,p;for(e=s[0],a=0;a<s.length-1;a++)p=M(this,c[r+a],t,a),p===C&&(p=this._$AH[a]),n||=!U(p)||p!==this._$AH[a],p===_?e=_:e!==_&&(e+=(p??"")+s[a+1]),this._$AH[a]=p}n&&!i&&this.j(e)}j(e){e===_?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class pt extends G{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===_?void 0:e}}class ft extends G{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==_)}}class _t extends G{constructor(e,t,r,i,s){super(e,t,r,i,s),this.type=5}_$AI(e,t=this){if((e=M(this,e,t,0)??_)===C)return;const r=this._$AH,i=e===_&&r!==_||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,s=e!==_&&(r===_||i);i&&this.element.removeEventListener(this.name,this,r),s&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class mt{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){M(this,e)}}const gt=Y.litHtmlPolyfillSupport;gt?.(V,I),(Y.litHtmlVersions??=[]).push("3.3.2");const vt=(o,e,t)=>{const r=t?.renderBefore??e;let i=r._$litPart$;if(i===void 0){const s=t?.renderBefore??null;r._$litPart$=i=new I(e.insertBefore(N(),s),s,void 0,t??{})}return i._$AI(o),i};const ee=globalThis;class y extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=vt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return C}}y._$litElement$=!0,y.finalized=!0,ee.litElementHydrateSupport?.({LitElement:y});const yt=ee.litElementPolyfillSupport;yt?.({LitElement:y}),(ee.litElementVersions??=[]).push("4.2.2");const R=o=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(o,e)}):customElements.define(o,e)};const $t={attribute:!0,type:String,converter:F,reflect:!1,hasChanged:J},bt=(o=$t,e,t)=>{const{kind:r,metadata:i}=t;let s=globalThis.litPropertyMetadata.get(i);if(s===void 0&&globalThis.litPropertyMetadata.set(i,s=new Map),r==="setter"&&((o=Object.create(o)).wrapped=!0),s.set(t.name,o),r==="accessor"){const{name:n}=t;return{set(c){const a=e.get.call(this);e.set.call(this,c),this.requestUpdate(n,a,o,!0,c)},init(c){return c!==void 0&&this.C(n,void 0,o,c),c}}}if(r==="setter"){const{name:n}=t;return function(c){const a=this[n];e.call(this,c),this.requestUpdate(n,a,o,!0,c)}}throw Error("Unsupported decorator location: "+r)};function v(o){return(e,t)=>typeof t=="object"?bt(o,e,t):((r,i,s)=>{const n=i.hasOwnProperty(s);return i.constructor.createProperty(s,r),n?Object.getOwnPropertyDescriptor(i,s):void 0})(o,e,t)}function T(o){return v({...o,state:!0,attribute:!1})}const xt="1.0.0",xe="home-maintenance-card",wt="home-maintenance-card-editor",g={title:"Home Maintenance",view_mode:"grid",progress_type:"ring",sort_by:"urgency",filter:"all",due_soon_days:7,show_header:!0,show_filter_bar:!1},te={on_track:"var(--success-color, #4caf50)",due_soon:"var(--warning-color, #ff9800)",overdue:"var(--error-color, #f44336)"},kt={overdue:100},At=["last_performed","next_due","interval_value","interval_type"];function Et(o){return o.entity_id.startsWith("binary_sensor.")?At.every(e=>e in o.attributes):!1}function we(o,e,t){if(e&&e.length>0){const i=new Set(t??[]);return e.filter(s=>!i.has(s)&&s in o.states)}const r=new Set(t??[]);return Object.keys(o.states).filter(i=>r.has(i)?!1:Et(o.states[i]))}function ke(o,e,t=new Date){const r=new Date(o.attributes.last_performed),i=new Date(o.attributes.next_due),s=i.getTime()-r.getTime(),n=t.getTime()-r.getTime(),c=s>0?Math.round(n/s*100):100,a=i.getTime()-t.getTime(),p=Math.ceil(a/(1e3*60*60*24));let u;return c>=kt.overdue?u="overdue":p<=e?u="due_soon":u="on_track",{entity_id:o.entity_id,name:o.attributes.friendly_name??o.entity_id,icon:o.attributes.icon??"mdi:calendar-check",state:o.state,last_performed:r,next_due:i,interval_value:o.attributes.interval_value,interval_type:o.attributes.interval_type,progress:Math.max(0,c),days_remaining:p,urgency:u}}function St(o,e){const t=[...o];switch(e){case"urgency":t.sort((r,i)=>i.progress-r.progress);break;case"name":t.sort((r,i)=>r.name.localeCompare(i.name));break;case"due_date":t.sort((r,i)=>r.next_due.getTime()-i.next_due.getTime());break}return t}function Ct(o,e){return e==="all"?o:o.filter(t=>t.urgency===e)}function Mt(o){switch(o){case"overdue":return"var(--error-color, #f44336)";case"due_soon":return"var(--warning-color, #ff9800)";case"on_track":return"var(--success-color, #4caf50)"}}function Tt(o,e){if(o<0){const t=Math.abs(o);return Ae(t,e,!0)}return o===0?zt(e):Ae(o,e,!1)}function zt(o){return o.startsWith("ca")?"Avui":o.startsWith("es")?"Hoy":"Today"}function Ae(o,e,t){if(e.startsWith("ca")){const i=o===1?"dia":"dies";return t?`${o} ${i} de retard`:`${o} ${i} restants`}if(e.startsWith("es")){const i=o===1?"d\xEDa":"d\xEDas";return t?`${o} ${i} de retraso`:`${o} ${i} restantes`}const r=o===1?"day":"days";return t?`${o} ${r} overdue`:`${o} ${r} left`}var Ee={version:"Version",invalid_configuration:"Invalid configuration"},Se={title:"Home Maintenance",overdue:"Overdue",due_soon:"Due soon",on_track:"On track",mark_done:"Done",confirm_done:"Mark this task as done?",no_tasks:"No maintenance tasks found",days_left:"{count} {unit} left",days_overdue:"{count} {unit} overdue",today:"Due today",last_performed:"Last performed",next_due:"Next due",every:"Every {value} {type}"},Ce={general:"General",entities:"Entities",display:"Display",features:"Features",title:"Title",view_mode:"View mode",progress_type:"Progress type",sort_by:"Sort by",filter:"Filter",columns:"Columns",due_soon_days:"Due soon threshold (days)",show_header:"Show summary header",show_filter_bar:"Show filter bar",grid:"Grid",list:"List",compact:"Compact",ring:"Ring",bar:"Bar",urgency:"Urgency",name:"Name",due_date:"Due date",all:"All",auto_discover:"Auto-discover entities"},Pt={common:Ee,card:Se,editor:Ce},Ot=Object.freeze({__proto__:null,card:Se,common:Ee,default:Pt,editor:Ce}),Me={version:"Versi\xF3n",invalid_configuration:"Configuraci\xF3n inv\xE1lida"},Te={title:"Mantenimiento del hogar",overdue:"Vencida",due_soon:"Pr\xF3xima",on_track:"Al d\xEDa",mark_done:"Hecho",confirm_done:"\xBFMarcar esta tarea como hecha?",no_tasks:"No se encontraron tareas de mantenimiento",days_left:"{count} {unit} restantes",days_overdue:"{count} {unit} de retraso",today:"Vence hoy",last_performed:"\xDAltima vez",next_due:"Pr\xF3xima vez",every:"Cada {value} {type}"},ze={general:"General",entities:"Entidades",display:"Visualizaci\xF3n",features:"Funciones",title:"T\xEDtulo",view_mode:"Modo de vista",progress_type:"Tipo de progreso",sort_by:"Ordenar por",filter:"Filtrar",columns:"Columnas",due_soon_days:"Umbral de pr\xF3xima (d\xEDas)",show_header:"Mostrar resumen",show_filter_bar:"Mostrar barra de filtros",grid:"Cuadr\xEDcula",list:"Lista",compact:"Compacto",ring:"Anillo",bar:"Barra",urgency:"Urgencia",name:"Nombre",due_date:"Fecha de vencimiento",all:"Todas",auto_discover:"Auto-descubrir entidades"},Dt={common:Me,card:Te,editor:ze},Nt=Object.freeze({__proto__:null,card:Te,common:Me,default:Dt,editor:ze}),Pe={version:"Versi\xF3",invalid_configuration:"Configuraci\xF3 inv\xE0lida"},Oe={title:"Manteniments",overdue:"Ven\xE7uda",due_soon:"Propera",on_track:"Al dia",mark_done:"Fet",confirm_done:"Marcar aquesta tasca com a feta?",no_tasks:"No s'han trobat tasques de manteniment",days_left:"{count} {unit} restants",days_overdue:"{count} {unit} de retard",today:"Ven\xE7 avui",last_performed:"\xDAltima vegada",next_due:"Propera vegada",every:"Cada {value} {type}"},De={general:"General",entities:"Entitats",display:"Visualitzaci\xF3",features:"Funcions",title:"T\xEDtol",view_mode:"Mode de vista",progress_type:"Tipus de progr\xE9s",sort_by:"Ordenar per",filter:"Filtrar",columns:"Columnes",due_soon_days:"Llindar de propera (dies)",show_header:"Mostrar resum",show_filter_bar:"Mostrar barra de filtres",grid:"Quadr\xEDcula",list:"Llista",compact:"Compacte",ring:"Anell",bar:"Barra",urgency:"Urg\xE8ncia",name:"Nom",due_date:"Data de venciment",all:"Totes",auto_discover:"Auto-descobrir entitats"},Ut={common:Pe,card:Oe,editor:De},Ht=Object.freeze({__proto__:null,card:Oe,common:Pe,default:Ut,editor:De}),Ne={version:"Version",invalid_configuration:"Configuration invalide"},Ue={title:"Entretien de la maison",overdue:"En retard",due_soon:"Bient\xF4t due",on_track:"\xC0 jour",mark_done:"Termin\xE9",confirm_done:"Marquer cette t\xE2che comme termin\xE9e ?",no_tasks:"Aucune t\xE2che d'entretien trouv\xE9e",days_left:"{count} {unit} restant(s)",days_overdue:"{count} {unit} en retard",today:"\xC9ch\xE9ance aujourd'hui",last_performed:"Derni\xE8re fois",next_due:"Prochaine fois",every:"Tous les {value} {type}"},He={general:"G\xE9n\xE9ral",entities:"Entit\xE9s",display:"Affichage",features:"Fonctionnalit\xE9s",title:"Titre",view_mode:"Mode d'affichage",progress_type:"Type de progression",sort_by:"Trier par",filter:"Filtrer",columns:"Colonnes",due_soon_days:"Seuil de prochaine (jours)",show_header:"Afficher le r\xE9sum\xE9",show_filter_bar:"Afficher la barre de filtres",grid:"Grille",list:"Liste",compact:"Compact",ring:"Anneau",bar:"Barre",urgency:"Urgence",name:"Nom",due_date:"Date d'\xE9ch\xE9ance",all:"Toutes",auto_discover:"D\xE9couverte automatique des entit\xE9s"},Rt={common:Ne,card:Ue,editor:He},Vt=Object.freeze({__proto__:null,card:Ue,common:Ne,default:Rt,editor:He}),Re={version:"Version",invalid_configuration:"Ung\xFCltige Konfiguration"},Ve={title:"Hauswartung",overdue:"\xDCberf\xE4llig",due_soon:"Demn\xE4chst f\xE4llig",on_track:"Im Plan",mark_done:"Erledigt",confirm_done:"Diese Aufgabe als erledigt markieren?",no_tasks:"Keine Wartungsaufgaben gefunden",days_left:"{count} {unit} \xFCbrig",days_overdue:"{count} {unit} \xFCberf\xE4llig",today:"Heute f\xE4llig",last_performed:"Zuletzt durchgef\xFChrt",next_due:"N\xE4chste F\xE4lligkeit",every:"Alle {value} {type}"},Ie={general:"Allgemein",entities:"Entit\xE4ten",display:"Anzeige",features:"Funktionen",title:"Titel",view_mode:"Ansichtsmodus",progress_type:"Fortschrittstyp",sort_by:"Sortieren nach",filter:"Filter",columns:"Spalten",due_soon_days:"Schwellenwert f\xFCr demn\xE4chst (Tage)",show_header:"Zusammenfassung anzeigen",show_filter_bar:"Filterleiste anzeigen",grid:"Raster",list:"Liste",compact:"Kompakt",ring:"Ring",bar:"Balken",urgency:"Dringlichkeit",name:"Name",due_date:"F\xE4lligkeitsdatum",all:"Alle",auto_discover:"Entit\xE4ten automatisch erkennen"},It={common:Re,card:Ve,editor:Ie},Lt=Object.freeze({__proto__:null,card:Ve,common:Re,default:It,editor:Ie}),Le={version:"Versione",invalid_configuration:"Configurazione non valida"},Be={title:"Manutenzione della casa",overdue:"Scaduta",due_soon:"In scadenza",on_track:"In regola",mark_done:"Completato",confirm_done:"Segnare questa attivit\xE0 come completata?",no_tasks:"Nessuna attivit\xE0 di manutenzione trovata",days_left:"{count} {unit} rimanenti",days_overdue:"{count} {unit} in ritardo",today:"Scade oggi",last_performed:"Ultima volta",next_due:"Prossima scadenza",every:"Ogni {value} {type}"},je={general:"Generale",entities:"Entit\xE0",display:"Visualizzazione",features:"Funzionalit\xE0",title:"Titolo",view_mode:"Modalit\xE0 visualizzazione",progress_type:"Tipo di progresso",sort_by:"Ordina per",filter:"Filtra",columns:"Colonne",due_soon_days:"Soglia prossima (giorni)",show_header:"Mostra riepilogo",show_filter_bar:"Mostra barra filtri",grid:"Griglia",list:"Elenco",compact:"Compatto",ring:"Anello",bar:"Barra",urgency:"Urgenza",name:"Nome",due_date:"Data di scadenza",all:"Tutte",auto_discover:"Scopri automaticamente le entit\xE0"},Bt={common:Le,card:Be,editor:je},jt=Object.freeze({__proto__:null,card:Be,common:Le,default:Bt,editor:je}),Fe={version:"Vers\xE3o",invalid_configuration:"Configura\xE7\xE3o inv\xE1lida"},We={title:"Manuten\xE7\xE3o da casa",overdue:"Atrasada",due_soon:"Em breve",on_track:"Em dia",mark_done:"Conclu\xEDdo",confirm_done:"Marcar esta tarefa como conclu\xEDda?",no_tasks:"Nenhuma tarefa de manuten\xE7\xE3o encontrada",days_left:"{count} {unit} restante(s)",days_overdue:"{count} {unit} atrasado(s)",today:"Vence hoje",last_performed:"\xDAltima vez",next_due:"Pr\xF3xima vez",every:"A cada {value} {type}"},Ge={general:"Geral",entities:"Entidades",display:"Visualiza\xE7\xE3o",features:"Funcionalidades",title:"T\xEDtulo",view_mode:"Modo de visualiza\xE7\xE3o",progress_type:"Tipo de progresso",sort_by:"Ordenar por",filter:"Filtrar",columns:"Colunas",due_soon_days:"Limite de pr\xF3xima (dias)",show_header:"Mostrar resumo",show_filter_bar:"Mostrar barra de filtros",grid:"Grelha",list:"Lista",compact:"Compacto",ring:"Anel",bar:"Barra",urgency:"Urg\xEAncia",name:"Nome",due_date:"Data de vencimento",all:"Todas",auto_discover:"Descobrir entidades automaticamente"},Ft={common:Fe,card:We,editor:Ge},Wt=Object.freeze({__proto__:null,card:We,common:Fe,default:Ft,editor:Ge}),qe={version:"Versie",invalid_configuration:"Ongeldige configuratie"},Ke={title:"Huisonderhoud",overdue:"Verlopen",due_soon:"Binnenkort",on_track:"Op schema",mark_done:"Gereed",confirm_done:"Deze taak als voltooid markeren?",no_tasks:"Geen onderhoudstaken gevonden",days_left:"{count} {unit} over",days_overdue:"{count} {unit} verlopen",today:"Vandaag verschuldigd",last_performed:"Laatst uitgevoerd",next_due:"Volgende keer",every:"Elke {value} {type}"},Ze={general:"Algemeen",entities:"Entiteiten",display:"Weergave",features:"Functies",title:"Titel",view_mode:"Weergavemodus",progress_type:"Voortgangstype",sort_by:"Sorteren op",filter:"Filter",columns:"Kolommen",due_soon_days:"Drempel binnenkort (dagen)",show_header:"Samenvatting tonen",show_filter_bar:"Filterbalk tonen",grid:"Raster",list:"Lijst",compact:"Compact",ring:"Ring",bar:"Balk",urgency:"Urgentie",name:"Naam",due_date:"Vervaldatum",all:"Alle",auto_discover:"Entiteiten automatisch ontdekken"},Gt={common:qe,card:Ke,editor:Ze},qt=Object.freeze({__proto__:null,card:Ke,common:qe,default:Gt,editor:Ze});const re={en:Ot,es:Nt,ca:Ht,fr:Vt,de:Lt,it:jt,pt:Wt,nl:qt};function ie(o,e){const t=e.split(".");let r=o;for(const i of t){if(r==null||typeof r!="object")return;r=r[i]}return typeof r=="string"?r:void 0}function d(o,e,t){const r=(localStorage.getItem("selectedLanguage")||"en").replace(/['"]+/g,"").replace("-","_");let i=ie(re[r],o);if(!i){const s=r.split("_")[0];i=ie(re[s],o)}return i||(i=ie(re.en,o)),i??o}const Kt=O`
  :host {
    --hm-grid-columns: var(--grid-columns, 3);
  }

  ha-card {
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 0 16px;
  }
  .card-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .card-content {
    padding: 16px;
  }

  /* Filter bar */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 0 12px 0;
  }
  .filter-chip {
    border: none;
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
    transition: all 0.15s ease;
  }
  .filter-chip:hover {
    background: var(--divider-color);
  }
  .filter-chip.active {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }

  /* Grid layout - min() ensures media queries override config columns */
  .task-grid {
    display: grid;
    grid-template-columns: repeat(min(var(--hm-grid-columns), var(--hm-max-columns, 99)), 1fr);
    gap: 12px;
  }
  .task-grid > * {
    min-width: 0; /* Allow grid items to shrink below content size */
  }

  /* List layout */
  .task-list {
    display: flex;
    flex-direction: column;
  }

  /* Compact layout */
  .task-compact {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Empty state */
  .empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--secondary-text-color);
    font-size: 14px;
  }
  .empty ha-icon {
    --mdc-icon-size: 48px;
    color: var(--divider-color);
    margin-bottom: 12px;
    display: block;
  }

  /* Skeleton */
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .skeleton-tile {
    border-radius: 12px;
    height: 140px;
    background: linear-gradient(
      90deg,
      var(--secondary-background-color) 25%,
      var(--divider-color) 50%,
      var(--secondary-background-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* Responsive - --hm-max-columns caps config columns at viewport breakpoints */
  @media (max-width: 900px) {
    :host {
      --hm-max-columns: 2;
    }
  }
  @media (max-width: 500px) {
    :host {
      --hm-max-columns: 1;
    }
    .card-content {
      padding: 12px;
    }
    .task-grid {
      gap: 8px;
    }
  }
`;let z=class extends y{constructor(){super(...arguments),this.progress=0,this.color="var(--primary-color)",this.size=48,this.strokeWidth=4}render(){const e=(this.size-this.strokeWidth)/2,t=2*Math.PI*e,r=Math.min(this.progress,100),i=t-r/100*t,s=this.size/2,n=Math.min(this.progress,999);return l`
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">
        ${lt`
          <circle
            class="track"
            cx="${s}"
            cy="${s}"
            r="${e}"
            fill="none"
            stroke="var(--divider-color, #e0e0e0)"
            stroke-width="${this.strokeWidth}"
          />
          <circle
            class="progress"
            cx="${s}"
            cy="${s}"
            r="${e}"
            fill="none"
            stroke="${this.color}"
            stroke-width="${this.strokeWidth}"
            stroke-dasharray="${t}"
            stroke-dashoffset="${i}"
            stroke-linecap="round"
            transform="rotate(-90 ${s} ${s})"
          />
          <text
            x="${s}"
            y="${s}"
            text-anchor="middle"
            dominant-baseline="central"
            class="pct-text"
            fill="var(--primary-text-color)"
          >${n}%</text>
        `}
      </svg>
    `}static get styles(){return O`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .progress {
        transition:
          stroke-dashoffset 0.6s ease,
          stroke 0.3s ease;
      }
      .pct-text {
        font-size: 11px;
        font-weight: 600;
      }
    `}};f([v({type:Number})],z.prototype,"progress",void 0),f([v({type:String})],z.prototype,"color",void 0),f([v({type:Number})],z.prototype,"size",void 0),f([v({type:Number})],z.prototype,"strokeWidth",void 0),z=f([R("hm-progress-ring")],z);let x=class extends y{constructor(){super(...arguments),this.progressType="ring",this.viewMode="grid",this._confirming=!1,this._done=!1}_handleDone(){if(!this._confirming){this._confirming=!0;return}this.hass.callService("home_maintenance","reset_last_performed",{entity_id:this.task.entity_id}),this._confirming=!1,this._done=!0,setTimeout(()=>{this._done=!1},1500)}_cancelConfirm(){this._confirming=!1}_showMoreInfo(){const e=new Event("hass-more-info",{bubbles:!0,composed:!0});e.detail={entityId:this.task.entity_id},this.dispatchEvent(e)}render(){const{task:e}=this,t=Mt(e.urgency),r=this.hass?.locale?.language??this.hass?.language??"en",i=Tt(e.days_remaining,r),s=e.urgency==="overdue";return this.viewMode==="list"?this._renderList(t,i,s):this.viewMode==="compact"?this._renderCompact(t,i,s):this._renderGrid(t,i,s)}_renderGrid(e,t,r){const{task:i}=this;return l`
      <div class="tile grid ${r?"overdue":""} ${this._done?"done-anim":""}">
        <div class="tile-top" @click=${this._showMoreInfo}>
          <div class="icon-wrap" style="color: ${e}">
            <ha-icon .icon=${i.icon}></ha-icon>
          </div>
          ${this._renderProgress(e)}
        </div>
        <div class="tile-body" @click=${this._showMoreInfo}>
          <div class="name">${i.name}</div>
          <div class="due" style="color: ${e}">${t}</div>
        </div>
        <div class="tile-actions">${this._renderDoneButton()}</div>
      </div>
    `}_renderList(e,t,r){const{task:i}=this;return l`
      <div class="tile list ${r?"overdue":""} ${this._done?"done-anim":""}">
        <div class="icon-wrap list-icon" style="color: ${e}" @click=${this._showMoreInfo}>
          <ha-icon .icon=${i.icon}></ha-icon>
        </div>
        <div class="list-info" @click=${this._showMoreInfo}>
          <div class="name">${i.name}</div>
          <div class="due" style="color: ${e}">${t}</div>
        </div>
        <div class="list-progress">${this._renderProgress(e)}</div>
        <div class="list-action">${this._renderDoneButton()}</div>
      </div>
    `}_renderCompact(e,t,r){const{task:i}=this;return l`
      <div
        class="tile compact ${r?"overdue":""} ${this._done?"done-anim":""}"
        @click=${this._showMoreInfo}
      >
        <div class="icon-wrap compact-icon" style="color: ${e}">
          <ha-icon .icon=${i.icon}></ha-icon>
        </div>
        <div class="compact-name">${i.name}</div>
        ${this._renderProgress(e,32,3)}
      </div>
    `}_renderProgress(e,t=48,r=4){if(this.progressType==="bar"){const i=Math.min(this.task.progress,100);return l`
        <div class="bar-wrap">
          <div class="bar-track">
            <div class="bar-fill" style="width:${i}%;background:${e};"></div>
          </div>
        </div>
      `}return l`
      <hm-progress-ring
        .progress=${this.task.progress}
        .color=${e}
        .size=${t}
        .strokeWidth=${r}
      ></hm-progress-ring>
    `}_renderDoneButton(){return this._done?l`
        <div class="done-check">
          <ha-icon icon="mdi:check-circle" style="color:var(--success-color, #4caf50)"></ha-icon>
        </div>
      `:this._confirming?l`
        <div class="confirm-row">
          <button class="btn btn-confirm" @click=${this._handleDone}>
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
          <button class="btn btn-cancel" @click=${this._cancelConfirm}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
      `:l`
      <button class="btn btn-done" @click=${this._handleDone}>${d("card.mark_done")}</button>
    `}static get styles(){return O`
      :host {
        display: block;
      }

      /* Grid tile */
      .tile.grid {
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        transition:
          box-shadow 0.2s ease,
          transform 0.2s ease,
          border-color 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .tile.grid:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }
      .tile-top {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        width: 100%;
      }
      .tile-body {
        text-align: center;
        cursor: pointer;
        width: 100%;
      }
      .tile-actions {
        margin-top: 4px;
      }

      /* List tile */
      .tile.list {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        transition: background 0.15s ease;
      }
      .tile.list:hover {
        background: var(--secondary-background-color);
      }
      .list-info {
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
      .list-progress {
        flex-shrink: 0;
      }
      .list-action {
        flex-shrink: 0;
      }

      /* Compact tile */
      .tile.compact {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.15s ease;
      }
      .tile.compact:hover {
        background: var(--secondary-background-color);
      }
      .compact-name {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Icon */
      .icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-wrap ha-icon {
        --mdc-icon-size: 28px;
      }
      .compact-icon ha-icon {
        --mdc-icon-size: 20px;
      }
      .list-icon {
        cursor: pointer;
      }

      /* Text */
      .name {
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .due {
        font-size: 12px;
        margin-top: 2px;
        font-weight: 500;
      }

      /* Progress bar variant */
      .bar-wrap {
        width: 100%;
        padding: 0 4px;
      }
      .bar-track {
        background: var(--divider-color, #e0e0e0);
        border-radius: 4px;
        height: 6px;
        width: 100%;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition:
          width 0.6s ease,
          background 0.3s ease;
      }

      /* Buttons */
      .btn {
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .btn-done {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .btn-done:hover {
        filter: brightness(1.1);
        transform: scale(1.03);
      }
      .btn-confirm {
        background: var(--success-color, #4caf50);
        color: #fff;
      }
      .btn-cancel {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }
      .btn-confirm ha-icon,
      .btn-cancel ha-icon {
        --mdc-icon-size: 16px;
      }
      .confirm-row {
        display: flex;
        gap: 6px;
      }
      .done-check {
        animation: popIn 0.3s ease;
      }
      .done-check ha-icon {
        --mdc-icon-size: 28px;
      }

      /* Overdue pulse */
      .tile.overdue {
        border-color: var(--error-color, #f44336);
      }
      .tile.overdue.grid {
        animation: overduePulse 2s ease-in-out infinite;
      }

      /* Done animation */
      .done-anim {
        animation: donePop 0.4s ease;
      }

      @keyframes overduePulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
        }
        50% {
          box-shadow: 0 0 12px 2px rgba(244, 67, 54, 0.2);
        }
      }
      @keyframes popIn {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        70% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes donePop {
        0% {
          transform: scale(1);
        }
        30% {
          transform: scale(0.97);
        }
        60% {
          transform: scale(1.02);
        }
        100% {
          transform: scale(1);
        }
      }
    `}};f([v({attribute:!1})],x.prototype,"hass",void 0),f([v({attribute:!1})],x.prototype,"task",void 0),f([v({type:String})],x.prototype,"progressType",void 0),f([v({type:String})],x.prototype,"viewMode",void 0),f([T()],x.prototype,"_confirming",void 0),f([T()],x.prototype,"_done",void 0),x=f([R("hm-task-tile")],x);let oe=class extends y{constructor(){super(...arguments),this.tasks=[]}render(){const e=this.tasks.filter(i=>i.urgency==="overdue").length,t=this.tasks.filter(i=>i.urgency==="due_soon").length,r=this.tasks.filter(i=>i.urgency==="on_track").length;return l`
      <div class="header">
        ${e>0?l`
              <span class="badge overdue" style="--badge-color:${te.overdue}">
                ${e} ${d("card.overdue")}
              </span>
            `:""}
        ${t>0?l`
              <span class="badge due-soon" style="--badge-color:${te.due_soon}">
                ${t} ${d("card.due_soon")}
              </span>
            `:""}
        ${r>0?l`
              <span class="badge on-track" style="--badge-color:${te.on_track}">
                ${r} ${d("card.on_track")}
              </span>
            `:""}
      </div>
    `}static get styles(){return O`
      .header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 0 12px 0;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
      }
    `}};f([v({attribute:!1})],oe.prototype,"tasks",void 0),oe=f([R("hm-summary-header")],oe),console.info(`%c HOME-MAINTENANCE-CARD 
%c ${d("common.version")} ${xt} `,"color: orange; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray"),window.customCards=window.customCards||[],window.customCards.push({type:xe,name:"Home Maintenance Card",description:"Visual task tracker for the Home Maintenance integration with progress rings, auto-discovery, and one-tap completion.",preview:!0});let E=class extends y{constructor(){super(...arguments),this._activeFilter=g.filter}static async getConfigElement(){return await Promise.resolve().then(function(){return Zt}),document.createElement("home-maintenance-card-editor")}static getStubConfig(){return{title:g.title}}setConfig(e){if(!e)throw new Error(d("common.invalid_configuration"));this._config={...e},this._activeFilter=e.filter??g.filter}getCardSize(){return 3}shouldUpdate(e){if(e.has("_config")||e.has("_activeFilter"))return!0;if(!e.has("hass"))return!1;const t=e.get("hass");return t?we(this.hass,this._config.entities,this._config.exclude_entities).some(i=>t.states[i]!==this.hass.states[i]):!0}render(){if(!this.hass||!this._config)return l`
        <ha-card>
          <div class="card-content">
            <div class="task-grid" style="--hm-grid-columns:${this._columns()}">
              ${[1,2,3].map(()=>l`<div class="skeleton-tile"></div>`)}
            </div>
          </div>
        </ha-card>
      `;const e=we(this.hass,this._config.entities,this._config.exclude_entities),t=this._config.due_soon_days??g.due_soon_days;let r=e.map(m=>this.hass.states[m]).filter(Boolean).map(m=>ke(m,t));const i=this._config.sort_by??g.sort_by;r=St(r,i),r=Ct(r,this._activeFilter);const s=e.map(m=>this.hass.states[m]).filter(Boolean).map(m=>ke(m,t)),n=this._config.view_mode??g.view_mode,c=this._config.progress_type??g.progress_type,a=this._config.show_header??g.show_header,p=this._config.show_filter_bar??g.show_filter_bar,u=this._config.title,h=this._columns();return l`
      <ha-card>
        ${u?l`
              <div class="card-header">
                <span class="card-title">${u}</span>
              </div>
            `:_}
        <div class="card-content">
          ${a?l`<hm-summary-header .tasks=${s}></hm-summary-header>`:_}
          ${p?this._renderFilterBar():_}
          ${r.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  ${d("card.no_tasks")}
                </div>
              `:this._renderTasks(r,n,c,h)}
        </div>
      </ha-card>
    `}_renderFilterBar(){return l`
      <div class="filter-bar">
        ${["all","overdue","due_soon","on_track"].map(t=>l`
            <button
              class="filter-chip ${this._activeFilter===t?"active":""}"
              @click=${()=>{this._activeFilter=t}}
            >
              ${d(`editor.${t}`)}
            </button>
          `)}
      </div>
    `}_renderTasks(e,t,r,i){const s=t==="list"?"task-list":t==="compact"?"task-compact":"task-grid",n=t==="grid"?`--hm-grid-columns:${i}`:"";return l`
      <div class="${s}" style="${n}">
        ${e.map(c=>l`
            <hm-task-tile
              .hass=${this.hass}
              .task=${c}
              .progressType=${r}
              .viewMode=${t}
            ></hm-task-tile>
          `)}
      </div>
    `}_columns(){return this._config?.columns??3}};E.styles=Kt,f([v({attribute:!1})],E.prototype,"hass",void 0),f([T()],E.prototype,"_config",void 0),f([T()],E.prototype,"_activeFilter",void 0),E=f([R(xe)],E);var Je;(function(o){o.language="language",o.system="system",o.comma_decimal="comma_decimal",o.decimal_comma="decimal_comma",o.space_comma="space_comma",o.none="none"})(Je||(Je={}));var Ye;(function(o){o.language="language",o.system="system",o.am_pm="12",o.twenty_four="24"})(Ye||(Ye={}));const q=(o,e,t,r)=>{r=r||{},t=t??{};const i=new Event(e,{bubbles:r.bubbles===void 0?!0:r.bubbles,cancelable:!!r.cancelable,composed:r.composed===void 0?!0:r.composed});return i.detail=t,o.dispatchEvent(i),i};let P=class extends y{constructor(){super(...arguments),this._openSection="general"}setConfig(e){this._config={...e}}render(){return!this.hass||!this._config?l``:l`
      ${this._renderSection("general",d("editor.general"),this._renderGeneral())}
      ${this._renderSection("entities",d("editor.entities"),this._renderEntities())}
      ${this._renderSection("display",d("editor.display"),this._renderDisplay())}
      ${this._renderSection("features",d("editor.features"),this._renderFeatures())}
    `}_renderGeneral(){const e=this._config;return l`
      <ha-textfield
        .label=${d("editor.title")}
        .value=${e.title??""}
        .configValue=${"title"}
        @input=${this._valueChanged}
      ></ha-textfield>

      <ha-select
        .label=${d("editor.view_mode")}
        .value=${e.view_mode??g.view_mode}
        .configValue=${"view_mode"}
        .options=${[{value:"grid",label:d("editor.grid")},{value:"list",label:d("editor.list")},{value:"compact",label:d("editor.compact")}]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-select
        .label=${d("editor.progress_type")}
        .value=${e.progress_type??g.progress_type}
        .configValue=${"progress_type"}
        .options=${[{value:"ring",label:d("editor.ring")},{value:"bar",label:d("editor.bar")}]}
        @selected=${this._selectChanged}
      ></ha-select>
    `}_renderEntities(){return l`
      <p style="color:var(--secondary-text-color);font-size:13px;margin:0 0 12px 0;">
        ${d("editor.auto_discover")}
      </p>
    `}_renderDisplay(){const e=this._config;return l`
      <ha-select
        .label=${d("editor.sort_by")}
        .value=${e.sort_by??g.sort_by}
        .configValue=${"sort_by"}
        .options=${[{value:"urgency",label:d("editor.urgency")},{value:"name",label:d("editor.name")},{value:"due_date",label:d("editor.due_date")}]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-select
        .label=${d("editor.filter")}
        .value=${e.filter??g.filter}
        .configValue=${"filter"}
        .options=${[{value:"all",label:d("editor.all")},{value:"overdue",label:d("card.overdue")},{value:"due_soon",label:d("card.due_soon")},{value:"on_track",label:d("card.on_track")}]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-textfield
        .label=${d("editor.columns")}
        type="number"
        min="1"
        max="6"
        .value=${String(e.columns??3)}
        .configValue=${"columns"}
        @input=${this._numChanged}
      ></ha-textfield>

      <ha-textfield
        .label=${d("editor.due_soon_days")}
        type="number"
        min="1"
        max="90"
        .value=${String(e.due_soon_days??g.due_soon_days)}
        .configValue=${"due_soon_days"}
        @input=${this._numChanged}
      ></ha-textfield>
    `}_renderFeatures(){const e=this._config;return l`
      <ha-formfield .label=${d("editor.show_header")}>
        <ha-switch
          .checked=${e.show_header??g.show_header}
          .configValue=${"show_header"}
          @change=${this._boolChanged}
        ></ha-switch>
      </ha-formfield>

      <ha-formfield .label=${d("editor.show_filter_bar")}>
        <ha-switch
          .checked=${e.show_filter_bar??g.show_filter_bar}
          .configValue=${"show_filter_bar"}
          @change=${this._boolChanged}
        ></ha-switch>
      </ha-formfield>
    `}_renderSection(e,t,r){const i=this._openSection===e;return l`
      <div class="accordion ${i?"accordion--open":""}">
        <button
          class="accordion__header"
          @click=${s=>{s.stopPropagation(),this._openSection=this._openSection===e?"":e}}
          aria-expanded=${i}
        >
          <span>${t}</span>
          <ha-icon .icon=${i?"mdi:chevron-up":"mdi:chevron-down"}></ha-icon>
        </button>
        <div class="accordion__body">
          <div class="accordion__content">${r}</div>
        </div>
      </div>
    `}_selectChanged(e){if(!this._config)return;const r=e.target.configValue;if(!r)return;const i=e.detail?.value;i!==void 0&&this._config[r]!==i&&(this._config={...this._config,[r]:i===""?void 0:i},q(this,"config-changed",{config:this._config}))}_valueChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;if(!r)return;const i=t.value;this._config[r]!==i&&(this._config={...this._config,[r]:i===""?void 0:i},q(this,"config-changed",{config:this._config}))}_numChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;if(!r)return;const i=parseInt(t.value,10);isNaN(i)||this._config[r]!==i&&(this._config={...this._config,[r]:i},q(this,"config-changed",{config:this._config}))}_boolChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;r&&this._config[r]!==t.checked&&(this._config={...this._config,[r]:t.checked},q(this,"config-changed",{config:this._config}))}static get styles(){return O`
      ha-select,
      ha-textfield {
        margin-bottom: 16px;
        display: block;
      }
      ha-formfield {
        display: block;
        padding: 8px 0;
      }
      .accordion {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 8px;
        /* overflow: visible so ha-select dropdowns are not clipped */
      }
      .accordion__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        background: var(--secondary-background-color);
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        text-align: left;
        transition: background 0.15s ease;
      }
      .accordion__header:hover {
        background: var(--divider-color);
      }
      .accordion--open .accordion__header {
        border-bottom: 1px solid var(--divider-color);
      }
      .accordion__body {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.25s ease;
      }
      .accordion--open .accordion__body {
        grid-template-rows: 1fr;
      }
      .accordion__content {
        overflow: visible;
        padding: 0 16px;
      }
      .accordion--open .accordion__content {
        padding: 16px;
      }
    `}};f([v({attribute:!1})],P.prototype,"hass",void 0),f([T()],P.prototype,"_config",void 0),f([T()],P.prototype,"_openSection",void 0),P=f([R(wt)],P);var Zt=Object.freeze({__proto__:null,get HomeMaintenanceCardEditor(){return P}});export{E as HomeMaintenanceCard};
