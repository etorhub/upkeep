function m(s,e,t,r){var i=arguments.length,o=i<3?e:r===null?r=Object.getOwnPropertyDescriptor(e,t):r,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(s,e,t,r);else for(var c=s.length-1;c>=0;c--)(n=s[c])&&(o=(i<3?n(o):i>3?n(e,t,o):n(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o}typeof SuppressedError=="function"&&SuppressedError;const B=globalThis,q=B.ShadowRoot&&(B.ShadyCSS===void 0||B.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,K=Symbol(),oe=new WeakMap;let ne=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==K)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(q&&e===void 0){const r=t!==void 0&&t.length===1;r&&(e=oe.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&oe.set(t,e))}return e}toString(){return this.cssText}};const Qe=s=>new ne(typeof s=="string"?s:s+"",void 0,K),O=(s,...e)=>{const t=s.length===1?s[0]:e.reduce((r,i,o)=>r+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+s[o+1],s[0]);return new ne(t,s,K)},Xe=(s,e)=>{if(q)s.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const r=document.createElement("style"),i=B.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=t.cssText,s.appendChild(r)}},ae=q?s=>s:s=>s instanceof CSSStyleSheet?(e=>{let t="";for(const r of e.cssRules)t+=r.cssText;return Qe(t)})(s):s;const{is:et,defineProperty:tt,getOwnPropertyDescriptor:rt,getOwnPropertyNames:it,getOwnPropertySymbols:st,getPrototypeOf:ot}=Object,j=globalThis,ce=j.trustedTypes,nt=ce?ce.emptyScript:"",at=j.reactiveElementPolyfillSupport,D=(s,e)=>s,F={toAttribute(s,e){switch(e){case Boolean:s=s?nt:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,e){let t=s;switch(e){case Boolean:t=s!==null;break;case Number:t=s===null?null:Number(s);break;case Object:case Array:try{t=JSON.parse(s)}catch{t=null}}return t}},Z=(s,e)=>!et(s,e),de={attribute:!0,type:String,converter:F,reflect:!1,useDefault:!1,hasChanged:Z};Symbol.metadata??=Symbol("metadata"),j.litPropertyMetadata??=new WeakMap;let S=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=de){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(e,r,t);i!==void 0&&tt(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){const{get:i,set:o}=rt(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:i,set(n){const c=i?.call(this);o?.call(this,n),this.requestUpdate(e,c,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??de}static _$Ei(){if(this.hasOwnProperty(D("elementProperties")))return;const e=ot(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(D("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(D("properties"))){const t=this.properties,r=[...it(t),...st(t)];for(const i of r)this.createProperty(i,t[i])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[r,i]of t)this.elementProperties.set(r,i)}this._$Eh=new Map;for(const[t,r]of this.elementProperties){const i=this._$Eu(t,r);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const r=new Set(e.flat(1/0).reverse());for(const i of r)t.unshift(ae(i))}else e!==void 0&&t.push(ae(e));return t}static _$Eu(e,t){const r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Xe(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){const r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(i!==void 0&&r.reflect===!0){const o=(r.converter?.toAttribute!==void 0?r.converter:F).toAttribute(t,r.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){const r=this.constructor,i=r._$Eh.get(e);if(i!==void 0&&this._$Em!==i){const o=r.getPropertyOptions(i),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:F;this._$Em=i;const c=n.fromAttribute(t,o.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(e,t,r,i=!1,o){if(e!==void 0){const n=this.constructor;if(i===!1&&(o=this[e]),r??=n.getPropertyOptions(e),!((r.hasChanged??Z)(o,t)||r.useDefault&&r.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:o},n){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),o!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[i,o]of r){const{wrapped:n}=o,c=this[i];n!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,o,c)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};S.elementStyles=[],S.shadowRootOptions={mode:"open"},S[D("elementProperties")]=new Map,S[D("finalized")]=new Map,at?.({ReactiveElement:S}),(j.reactiveElementVersions??=[]).push("2.1.2");const J=globalThis,le=s=>s,W=J.trustedTypes,he=W?W.createPolicy("lit-html",{createHTML:s=>s}):void 0,ue="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,pe="?"+b,ct=`<${pe}>`,x=document,N=()=>x.createComment(""),U=s=>s===null||typeof s!="object"&&typeof s!="function",Y=Array.isArray,dt=s=>Y(s)||typeof s?.[Symbol.iterator]=="function",Q=`[ 	
\f\r]`,H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,me=/-->/g,_e=/>/g,k=RegExp(`>|${Q}(?:([^\\s"'>=/]+)(${Q}*=${Q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),fe=/'/g,ge=/"/g,ve=/^(?:script|style|textarea|title)$/i,$e=s=>(e,...t)=>({_$litType$:s,strings:e,values:t}),l=$e(1),lt=$e(2),C=Symbol.for("lit-noChange"),_=Symbol.for("lit-nothing"),ye=new WeakMap,A=x.createTreeWalker(x,129);function be(s,e){if(!Y(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return he!==void 0?he.createHTML(e):e}const ht=(s,e)=>{const t=s.length-1,r=[];let i,o=e===2?"<svg>":e===3?"<math>":"",n=H;for(let c=0;c<t;c++){const a=s[c];let p,u,h=-1,f=0;for(;f<a.length&&(n.lastIndex=f,u=n.exec(a),u!==null);)f=n.lastIndex,n===H?u[1]==="!--"?n=me:u[1]!==void 0?n=_e:u[2]!==void 0?(ve.test(u[2])&&(i=RegExp("</"+u[2],"g")),n=k):u[3]!==void 0&&(n=k):n===k?u[0]===">"?(n=i??H,h=-1):u[1]===void 0?h=-2:(h=n.lastIndex-u[2].length,p=u[1],n=u[3]===void 0?k:u[3]==='"'?ge:fe):n===ge||n===fe?n=k:n===me||n===_e?n=H:(n=k,i=void 0);const y=n===k&&s[c+1].startsWith("/>")?" ":"";o+=n===H?a+ct:h>=0?(r.push(p),a.slice(0,h)+ue+a.slice(h)+b+y):a+b+(h===-2?c:y)}return[be(s,o+(s[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]};class V{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let o=0,n=0;const c=e.length-1,a=this.parts,[p,u]=ht(e,t);if(this.el=V.createElement(p,r),A.currentNode=this.el.content,t===2||t===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=A.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(const h of i.getAttributeNames())if(h.endsWith(ue)){const f=u[n++],y=i.getAttribute(h).split(b),L=/([.?@])?(.*)/.exec(f);a.push({type:1,index:o,name:L[2],strings:y,ctor:L[1]==="."?pt:L[1]==="?"?mt:L[1]==="@"?_t:G}),i.removeAttribute(h)}else h.startsWith(b)&&(a.push({type:6,index:o}),i.removeAttribute(h));if(ve.test(i.tagName)){const h=i.textContent.split(b),f=h.length-1;if(f>0){i.textContent=W?W.emptyScript:"";for(let y=0;y<f;y++)i.append(h[y],N()),A.nextNode(),a.push({type:2,index:++o});i.append(h[f],N())}}}else if(i.nodeType===8)if(i.data===pe)a.push({type:2,index:o});else{let h=-1;for(;(h=i.data.indexOf(b,h+1))!==-1;)a.push({type:7,index:o}),h+=b.length-1}o++}}static createElement(e,t){const r=x.createElement("template");return r.innerHTML=e,r}}function M(s,e,t=s,r){if(e===C)return e;let i=r!==void 0?t._$Co?.[r]:t._$Cl;const o=U(e)?void 0:e._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(s),i._$AT(s,t,r)),r!==void 0?(t._$Co??=[])[r]=i:t._$Cl=i),i!==void 0&&(e=M(s,i._$AS(s,e.values),i,r)),e}class ut{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,i=(e?.creationScope??x).importNode(t,!0);A.currentNode=i;let o=A.nextNode(),n=0,c=0,a=r[0];for(;a!==void 0;){if(n===a.index){let p;a.type===2?p=new I(o,o.nextSibling,this,e):a.type===1?p=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(p=new ft(o,this,e)),this._$AV.push(p),a=r[++c]}n!==a?.index&&(o=A.nextNode(),n++)}return A.currentNode=x,i}p(e){let t=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}}class I{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=_,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=M(this,e,t),U(e)?e===_||e==null||e===""?(this._$AH!==_&&this._$AR(),this._$AH=_):e!==this._$AH&&e!==C&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):dt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==_&&U(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:r}=e,i=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=V.createElement(be(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(t);else{const o=new ut(i,this),n=o.u(this.options);o.p(t),this.T(n),this._$AH=o}}_$AC(e){let t=ye.get(e.strings);return t===void 0&&ye.set(e.strings,t=new V(e)),t}k(e){Y(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let r,i=0;for(const o of e)i===t.length?t.push(r=new I(this.O(N()),this.O(N()),this,this.options)):r=t[i],r._$AI(o),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const r=le(e).nextSibling;le(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}}class G{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,o){this.type=1,this._$AH=_,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=o,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=_}_$AI(e,t=this,r,i){const o=this.strings;let n=!1;if(o===void 0)e=M(this,e,t,0),n=!U(e)||e!==this._$AH&&e!==C,n&&(this._$AH=e);else{const c=e;let a,p;for(e=o[0],a=0;a<o.length-1;a++)p=M(this,c[r+a],t,a),p===C&&(p=this._$AH[a]),n||=!U(p)||p!==this._$AH[a],p===_?e=_:e!==_&&(e+=(p??"")+o[a+1]),this._$AH[a]=p}n&&!i&&this.j(e)}j(e){e===_?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class pt extends G{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===_?void 0:e}}class mt extends G{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==_)}}class _t extends G{constructor(e,t,r,i,o){super(e,t,r,i,o),this.type=5}_$AI(e,t=this){if((e=M(this,e,t,0)??_)===C)return;const r=this._$AH,i=e===_&&r!==_||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,o=e!==_&&(r===_||i);i&&this.element.removeEventListener(this.name,this,r),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ft{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){M(this,e)}}const gt=J.litHtmlPolyfillSupport;gt?.(V,I),(J.litHtmlVersions??=[]).push("3.3.2");const vt=(s,e,t)=>{const r=t?.renderBefore??e;let i=r._$litPart$;if(i===void 0){const o=t?.renderBefore??null;r._$litPart$=i=new I(e.insertBefore(N(),o),o,void 0,t??{})}return i._$AI(s),i};const X=globalThis;class $ extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=vt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return C}}$._$litElement$=!0,$.finalized=!0,X.litElementHydrateSupport?.({LitElement:$});const $t=X.litElementPolyfillSupport;$t?.({LitElement:$}),(X.litElementVersions??=[]).push("4.2.2");const R=s=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(s,e)}):customElements.define(s,e)};const yt={attribute:!0,type:String,converter:F,reflect:!1,hasChanged:Z},bt=(s=yt,e,t)=>{const{kind:r,metadata:i}=t;let o=globalThis.litPropertyMetadata.get(i);if(o===void 0&&globalThis.litPropertyMetadata.set(i,o=new Map),r==="setter"&&((s=Object.create(s)).wrapped=!0),o.set(t.name,s),r==="accessor"){const{name:n}=t;return{set(c){const a=e.get.call(this);e.set.call(this,c),this.requestUpdate(n,a,s,!0,c)},init(c){return c!==void 0&&this.C(n,void 0,s,c),c}}}if(r==="setter"){const{name:n}=t;return function(c){const a=this[n];e.call(this,c),this.requestUpdate(n,a,s,!0,c)}}throw Error("Unsupported decorator location: "+r)};function v(s){return(e,t)=>typeof t=="object"?bt(s,e,t):((r,i,o)=>{const n=i.hasOwnProperty(o);return i.constructor.createProperty(o,r),n?Object.getOwnPropertyDescriptor(i,o):void 0})(s,e,t)}function T(s){return v({...s,state:!0,attribute:!1})}const wt="1.0.0",we="home-maintenance-card",xt="home-maintenance-card-editor",g={title:"Home Maintenance",view_mode:"grid",progress_type:"ring",sort_by:"urgency",filter:"all",due_soon_days:7,show_header:!0,show_filter_bar:!1},ee={on_track:"var(--success-color, #4caf50)",due_soon:"var(--warning-color, #ff9800)",overdue:"var(--error-color, #f44336)"},kt={overdue:100},At=["last_performed","next_due","interval_value","interval_type"];function Et(s){return s.entity_id.startsWith("binary_sensor.")?At.every(e=>e in s.attributes):!1}function xe(s,e,t){if(e&&e.length>0){const i=new Set(t??[]);return e.filter(o=>!i.has(o)&&o in s.states)}const r=new Set(t??[]);return Object.keys(s.states).filter(i=>r.has(i)?!1:Et(s.states[i]))}function ke(s,e,t=new Date){const r=new Date(s.attributes.last_performed),i=new Date(s.attributes.next_due),o=i.getTime()-r.getTime(),n=t.getTime()-r.getTime(),c=o>0?Math.round(n/o*100):100,a=i.getTime()-t.getTime(),p=Math.ceil(a/(1e3*60*60*24));let u;return c>=kt.overdue?u="overdue":p<=e?u="due_soon":u="on_track",{entity_id:s.entity_id,name:s.attributes.friendly_name??s.entity_id,icon:s.attributes.icon??"mdi:calendar-check",state:s.state,last_performed:r,next_due:i,interval_value:s.attributes.interval_value,interval_type:s.attributes.interval_type,progress:Math.max(0,c),days_remaining:p,urgency:u}}function St(s,e){const t=[...s];switch(e){case"urgency":t.sort((r,i)=>i.progress-r.progress);break;case"name":t.sort((r,i)=>r.name.localeCompare(i.name));break;case"due_date":t.sort((r,i)=>r.next_due.getTime()-i.next_due.getTime());break}return t}function Ct(s,e){return e==="all"?s:s.filter(t=>t.urgency===e)}function Mt(s){switch(s){case"overdue":return"var(--error-color, #f44336)";case"due_soon":return"var(--warning-color, #ff9800)";case"on_track":return"var(--success-color, #4caf50)"}}function Tt(s,e){if(s<0){const t=Math.abs(s);return Ae(t,e,!0)}return s===0?Pt(e):Ae(s,e,!1)}function Pt(s){return s.startsWith("ca")?"Avui":s.startsWith("es")?"Hoy":"Today"}function Ae(s,e,t){if(e.startsWith("ca")){const i=s===1?"dia":"dies";return t?`${s} ${i} de retard`:`${s} ${i} restants`}if(e.startsWith("es")){const i=s===1?"d\xEDa":"d\xEDas";return t?`${s} ${i} de retraso`:`${s} ${i} restantes`}const r=s===1?"day":"days";return t?`${s} ${r} overdue`:`${s} ${r} left`}var Ee={version:"Version",invalid_configuration:"Invalid configuration"},Se={title:"Home Maintenance",overdue:"Overdue",due_soon:"Due soon",on_track:"On track",mark_done:"Done",confirm_done:"Mark this task as done?",no_tasks:"No maintenance tasks found",days_left:"{count} {unit} left",days_overdue:"{count} {unit} overdue",today:"Due today",last_performed:"Last performed",next_due:"Next due",every:"Every {value} {type}"},Ce={general:"General",entities:"Entities",display:"Display",features:"Features",title:"Title",view_mode:"View mode",progress_type:"Progress type",sort_by:"Sort by",filter:"Filter",columns:"Columns",due_soon_days:"Due soon threshold (days)",show_header:"Show summary header",show_filter_bar:"Show filter bar",grid:"Grid",list:"List",compact:"Compact",ring:"Ring",bar:"Bar",urgency:"Urgency",name:"Name",due_date:"Due date",all:"All",auto_discover:"Auto-discover entities"},zt={common:Ee,card:Se,editor:Ce},Ot=Object.freeze({__proto__:null,card:Se,common:Ee,default:zt,editor:Ce}),Me={version:"Versi\xF3n",invalid_configuration:"Configuraci\xF3n inv\xE1lida"},Te={title:"Mantenimiento del hogar",overdue:"Vencida",due_soon:"Pr\xF3xima",on_track:"Al d\xEDa",mark_done:"Hecho",confirm_done:"\xBFMarcar esta tarea como hecha?",no_tasks:"No se encontraron tareas de mantenimiento",days_left:"{count} {unit} restantes",days_overdue:"{count} {unit} de retraso",today:"Vence hoy",last_performed:"\xDAltima vez",next_due:"Pr\xF3xima vez",every:"Cada {value} {type}"},Pe={general:"General",entities:"Entidades",display:"Visualizaci\xF3n",features:"Funciones",title:"T\xEDtulo",view_mode:"Modo de vista",progress_type:"Tipo de progreso",sort_by:"Ordenar por",filter:"Filtrar",columns:"Columnas",due_soon_days:"Umbral de pr\xF3xima (d\xEDas)",show_header:"Mostrar resumen",show_filter_bar:"Mostrar barra de filtros",grid:"Cuadr\xEDcula",list:"Lista",compact:"Compacto",ring:"Anillo",bar:"Barra",urgency:"Urgencia",name:"Nombre",due_date:"Fecha de vencimiento",all:"Todas",auto_discover:"Auto-descubrir entidades"},Dt={common:Me,card:Te,editor:Pe},Nt=Object.freeze({__proto__:null,card:Te,common:Me,default:Dt,editor:Pe}),ze={version:"Versi\xF3",invalid_configuration:"Configuraci\xF3 inv\xE0lida"},Oe={title:"Manteniments",overdue:"Ven\xE7uda",due_soon:"Propera",on_track:"Al dia",mark_done:"Fet",confirm_done:"Marcar aquesta tasca com a feta?",no_tasks:"No s'han trobat tasques de manteniment",days_left:"{count} {unit} restants",days_overdue:"{count} {unit} de retard",today:"Ven\xE7 avui",last_performed:"\xDAltima vegada",next_due:"Propera vegada",every:"Cada {value} {type}"},De={general:"General",entities:"Entitats",display:"Visualitzaci\xF3",features:"Funcions",title:"T\xEDtol",view_mode:"Mode de vista",progress_type:"Tipus de progr\xE9s",sort_by:"Ordenar per",filter:"Filtrar",columns:"Columnes",due_soon_days:"Llindar de propera (dies)",show_header:"Mostrar resum",show_filter_bar:"Mostrar barra de filtres",grid:"Quadr\xEDcula",list:"Llista",compact:"Compacte",ring:"Anell",bar:"Barra",urgency:"Urg\xE8ncia",name:"Nom",due_date:"Data de venciment",all:"Totes",auto_discover:"Auto-descobrir entitats"},Ut={common:ze,card:Oe,editor:De},Ht=Object.freeze({__proto__:null,card:Oe,common:ze,default:Ut,editor:De}),Ne={version:"Version",invalid_configuration:"Configuration invalide"},Ue={title:"Entretien de la maison",overdue:"En retard",due_soon:"Bient\xF4t due",on_track:"\xC0 jour",mark_done:"Termin\xE9",confirm_done:"Marquer cette t\xE2che comme termin\xE9e ?",no_tasks:"Aucune t\xE2che d'entretien trouv\xE9e",days_left:"{count} {unit} restant(s)",days_overdue:"{count} {unit} en retard",today:"\xC9ch\xE9ance aujourd'hui",last_performed:"Derni\xE8re fois",next_due:"Prochaine fois",every:"Tous les {value} {type}"},He={general:"G\xE9n\xE9ral",entities:"Entit\xE9s",display:"Affichage",features:"Fonctionnalit\xE9s",title:"Titre",view_mode:"Mode d'affichage",progress_type:"Type de progression",sort_by:"Trier par",filter:"Filtrer",columns:"Colonnes",due_soon_days:"Seuil de prochaine (jours)",show_header:"Afficher le r\xE9sum\xE9",show_filter_bar:"Afficher la barre de filtres",grid:"Grille",list:"Liste",compact:"Compact",ring:"Anneau",bar:"Barre",urgency:"Urgence",name:"Nom",due_date:"Date d'\xE9ch\xE9ance",all:"Toutes",auto_discover:"D\xE9couverte automatique des entit\xE9s"},Rt={common:Ne,card:Ue,editor:He},Vt=Object.freeze({__proto__:null,card:Ue,common:Ne,default:Rt,editor:He}),Re={version:"Version",invalid_configuration:"Ung\xFCltige Konfiguration"},Ve={title:"Hauswartung",overdue:"\xDCberf\xE4llig",due_soon:"Demn\xE4chst f\xE4llig",on_track:"Im Plan",mark_done:"Erledigt",confirm_done:"Diese Aufgabe als erledigt markieren?",no_tasks:"Keine Wartungsaufgaben gefunden",days_left:"{count} {unit} \xFCbrig",days_overdue:"{count} {unit} \xFCberf\xE4llig",today:"Heute f\xE4llig",last_performed:"Zuletzt durchgef\xFChrt",next_due:"N\xE4chste F\xE4lligkeit",every:"Alle {value} {type}"},Ie={general:"Allgemein",entities:"Entit\xE4ten",display:"Anzeige",features:"Funktionen",title:"Titel",view_mode:"Ansichtsmodus",progress_type:"Fortschrittstyp",sort_by:"Sortieren nach",filter:"Filter",columns:"Spalten",due_soon_days:"Schwellenwert f\xFCr demn\xE4chst (Tage)",show_header:"Zusammenfassung anzeigen",show_filter_bar:"Filterleiste anzeigen",grid:"Raster",list:"Liste",compact:"Kompakt",ring:"Ring",bar:"Balken",urgency:"Dringlichkeit",name:"Name",due_date:"F\xE4lligkeitsdatum",all:"Alle",auto_discover:"Entit\xE4ten automatisch erkennen"},It={common:Re,card:Ve,editor:Ie},Lt=Object.freeze({__proto__:null,card:Ve,common:Re,default:It,editor:Ie}),Le={version:"Versione",invalid_configuration:"Configurazione non valida"},Be={title:"Manutenzione della casa",overdue:"Scaduta",due_soon:"In scadenza",on_track:"In regola",mark_done:"Completato",confirm_done:"Segnare questa attivit\xE0 come completata?",no_tasks:"Nessuna attivit\xE0 di manutenzione trovata",days_left:"{count} {unit} rimanenti",days_overdue:"{count} {unit} in ritardo",today:"Scade oggi",last_performed:"Ultima volta",next_due:"Prossima scadenza",every:"Ogni {value} {type}"},je={general:"Generale",entities:"Entit\xE0",display:"Visualizzazione",features:"Funzionalit\xE0",title:"Titolo",view_mode:"Modalit\xE0 visualizzazione",progress_type:"Tipo di progresso",sort_by:"Ordina per",filter:"Filtra",columns:"Colonne",due_soon_days:"Soglia prossima (giorni)",show_header:"Mostra riepilogo",show_filter_bar:"Mostra barra filtri",grid:"Griglia",list:"Elenco",compact:"Compatto",ring:"Anello",bar:"Barra",urgency:"Urgenza",name:"Nome",due_date:"Data di scadenza",all:"Tutte",auto_discover:"Scopri automaticamente le entit\xE0"},Bt={common:Le,card:Be,editor:je},jt=Object.freeze({__proto__:null,card:Be,common:Le,default:Bt,editor:je}),Fe={version:"Vers\xE3o",invalid_configuration:"Configura\xE7\xE3o inv\xE1lida"},We={title:"Manuten\xE7\xE3o da casa",overdue:"Atrasada",due_soon:"Em breve",on_track:"Em dia",mark_done:"Conclu\xEDdo",confirm_done:"Marcar esta tarefa como conclu\xEDda?",no_tasks:"Nenhuma tarefa de manuten\xE7\xE3o encontrada",days_left:"{count} {unit} restante(s)",days_overdue:"{count} {unit} atrasado(s)",today:"Vence hoje",last_performed:"\xDAltima vez",next_due:"Pr\xF3xima vez",every:"A cada {value} {type}"},Ge={general:"Geral",entities:"Entidades",display:"Visualiza\xE7\xE3o",features:"Funcionalidades",title:"T\xEDtulo",view_mode:"Modo de visualiza\xE7\xE3o",progress_type:"Tipo de progresso",sort_by:"Ordenar por",filter:"Filtrar",columns:"Colunas",due_soon_days:"Limite de pr\xF3xima (dias)",show_header:"Mostrar resumo",show_filter_bar:"Mostrar barra de filtros",grid:"Grelha",list:"Lista",compact:"Compacto",ring:"Anel",bar:"Barra",urgency:"Urg\xEAncia",name:"Nome",due_date:"Data de vencimento",all:"Todas",auto_discover:"Descobrir entidades automaticamente"},Ft={common:Fe,card:We,editor:Ge},Wt=Object.freeze({__proto__:null,card:We,common:Fe,default:Ft,editor:Ge}),qe={version:"Versie",invalid_configuration:"Ongeldige configuratie"},Ke={title:"Huisonderhoud",overdue:"Verlopen",due_soon:"Binnenkort",on_track:"Op schema",mark_done:"Gereed",confirm_done:"Deze taak als voltooid markeren?",no_tasks:"Geen onderhoudstaken gevonden",days_left:"{count} {unit} over",days_overdue:"{count} {unit} verlopen",today:"Vandaag verschuldigd",last_performed:"Laatst uitgevoerd",next_due:"Volgende keer",every:"Elke {value} {type}"},Ze={general:"Algemeen",entities:"Entiteiten",display:"Weergave",features:"Functies",title:"Titel",view_mode:"Weergavemodus",progress_type:"Voortgangstype",sort_by:"Sorteren op",filter:"Filter",columns:"Kolommen",due_soon_days:"Drempel binnenkort (dagen)",show_header:"Samenvatting tonen",show_filter_bar:"Filterbalk tonen",grid:"Raster",list:"Lijst",compact:"Compact",ring:"Ring",bar:"Balk",urgency:"Urgentie",name:"Naam",due_date:"Vervaldatum",all:"Alle",auto_discover:"Entiteiten automatisch ontdekken"},Gt={common:qe,card:Ke,editor:Ze},qt=Object.freeze({__proto__:null,card:Ke,common:qe,default:Gt,editor:Ze});const te={en:Ot,es:Nt,ca:Ht,fr:Vt,de:Lt,it:jt,pt:Wt,nl:qt};function re(s,e){const t=e.split(".");let r=s;for(const i of t){if(r==null||typeof r!="object")return;r=r[i]}return typeof r=="string"?r:void 0}function d(s,e,t){const r=(localStorage.getItem("selectedLanguage")||"en").replace(/['"]+/g,"").replace("-","_");let i=re(te[r],s);if(!i){const o=r.split("_")[0];i=re(te[o],s)}return i||(i=re(te.en,s)),i??s}const Kt=O`
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

  /* Grid layout */
  .task-grid {
    display: grid;
    grid-template-columns: repeat(var(--hm-grid-columns), 1fr);
    gap: 12px;
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

  /* Responsive */
  @media (max-width: 900px) {
    :host {
      --hm-grid-columns: 2;
    }
  }
  @media (max-width: 500px) {
    :host {
      --hm-grid-columns: 1;
    }
    .card-content {
      padding: 12px;
    }
    .task-grid {
      gap: 8px;
    }
  }
`;let P=class extends ${constructor(){super(...arguments),this.progress=0,this.color="var(--primary-color)",this.size=48,this.strokeWidth=4}render(){const e=(this.size-this.strokeWidth)/2,t=2*Math.PI*e,r=Math.min(this.progress,100),i=t-r/100*t,o=this.size/2,n=Math.min(this.progress,999);return l`
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">
        ${lt`
          <circle
            class="track"
            cx="${o}"
            cy="${o}"
            r="${e}"
            fill="none"
            stroke="var(--divider-color, #e0e0e0)"
            stroke-width="${this.strokeWidth}"
          />
          <circle
            class="progress"
            cx="${o}"
            cy="${o}"
            r="${e}"
            fill="none"
            stroke="${this.color}"
            stroke-width="${this.strokeWidth}"
            stroke-dasharray="${t}"
            stroke-dashoffset="${i}"
            stroke-linecap="round"
            transform="rotate(-90 ${o} ${o})"
          />
          <text
            x="${o}"
            y="${o}"
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
    `}};m([v({type:Number})],P.prototype,"progress",void 0),m([v({type:String})],P.prototype,"color",void 0),m([v({type:Number})],P.prototype,"size",void 0),m([v({type:Number})],P.prototype,"strokeWidth",void 0),P=m([R("hm-progress-ring")],P);let w=class extends ${constructor(){super(...arguments),this.progressType="ring",this.viewMode="grid",this._confirming=!1,this._done=!1}_handleDone(){if(!this._confirming){this._confirming=!0;return}this.hass.callService("home_maintenance","reset_last_performed",{entity_id:this.task.entity_id}),this._confirming=!1,this._done=!0,setTimeout(()=>{this._done=!1},1500)}_cancelConfirm(){this._confirming=!1}_showMoreInfo(){const e=new Event("hass-more-info",{bubbles:!0,composed:!0});e.detail={entityId:this.task.entity_id},this.dispatchEvent(e)}render(){const{task:e}=this,t=Mt(e.urgency),r=this.hass?.locale?.language??this.hass?.language??"en",i=Tt(e.days_remaining,r),o=e.urgency==="overdue";return this.viewMode==="list"?this._renderList(t,i,o):this.viewMode==="compact"?this._renderCompact(t,i,o):this._renderGrid(t,i,o)}_renderGrid(e,t,r){const{task:i}=this;return l`
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
    `}};m([v({attribute:!1})],w.prototype,"hass",void 0),m([v({attribute:!1})],w.prototype,"task",void 0),m([v({type:String})],w.prototype,"progressType",void 0),m([v({type:String})],w.prototype,"viewMode",void 0),m([T()],w.prototype,"_confirming",void 0),m([T()],w.prototype,"_done",void 0),w=m([R("hm-task-tile")],w);let ie=class extends ${constructor(){super(...arguments),this.tasks=[]}render(){const e=this.tasks.filter(i=>i.urgency==="overdue").length,t=this.tasks.filter(i=>i.urgency==="due_soon").length,r=this.tasks.filter(i=>i.urgency==="on_track").length;return l`
      <div class="header">
        ${e>0?l`
              <span class="badge overdue" style="--badge-color:${ee.overdue}">
                ${e} ${d("card.overdue")}
              </span>
            `:""}
        ${t>0?l`
              <span class="badge due-soon" style="--badge-color:${ee.due_soon}">
                ${t} ${d("card.due_soon")}
              </span>
            `:""}
        ${r>0?l`
              <span class="badge on-track" style="--badge-color:${ee.on_track}">
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
    `}};m([v({attribute:!1})],ie.prototype,"tasks",void 0),ie=m([R("hm-summary-header")],ie),console.info(`%c HOME-MAINTENANCE-CARD 
%c ${d("common.version")} ${wt} `,"color: orange; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray"),window.customCards=window.customCards||[],window.customCards.push({type:we,name:"Home Maintenance Card",description:"Visual task tracker for the Home Maintenance integration with progress rings, auto-discovery, and one-tap completion.",preview:!0});let E=class extends ${constructor(){super(...arguments),this._activeFilter=g.filter}static async getConfigElement(){return await Promise.resolve().then(function(){return Zt}),document.createElement("home-maintenance-card-editor")}static getStubConfig(){return{title:g.title}}setConfig(e){if(!e)throw new Error(d("common.invalid_configuration"));this._config={...e},this._activeFilter=e.filter??g.filter}getCardSize(){return 3}shouldUpdate(e){if(e.has("_config")||e.has("_activeFilter"))return!0;if(!e.has("hass"))return!1;const t=e.get("hass");return t?xe(this.hass,this._config.entities,this._config.exclude_entities).some(i=>t.states[i]!==this.hass.states[i]):!0}render(){if(!this.hass||!this._config)return l`
        <ha-card>
          <div class="card-content">
            <div class="task-grid" style="--hm-grid-columns:${this._columns()}">
              ${[1,2,3].map(()=>l`<div class="skeleton-tile"></div>`)}
            </div>
          </div>
        </ha-card>
      `;const e=xe(this.hass,this._config.entities,this._config.exclude_entities),t=this._config.due_soon_days??g.due_soon_days;let r=e.map(f=>this.hass.states[f]).filter(Boolean).map(f=>ke(f,t));const i=this._config.sort_by??g.sort_by;r=St(r,i),r=Ct(r,this._activeFilter);const o=e.map(f=>this.hass.states[f]).filter(Boolean).map(f=>ke(f,t)),n=this._config.view_mode??g.view_mode,c=this._config.progress_type??g.progress_type,a=this._config.show_header??g.show_header,p=this._config.show_filter_bar??g.show_filter_bar,u=this._config.title,h=this._columns();return l`
      <ha-card>
        ${u?l`
              <div class="card-header">
                <span class="card-title">${u}</span>
              </div>
            `:_}
        <div class="card-content">
          ${a?l`<hm-summary-header .tasks=${o}></hm-summary-header>`:_}
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
    `}_renderTasks(e,t,r,i){const o=t==="list"?"task-list":t==="compact"?"task-compact":"task-grid",n=t==="grid"?`--hm-grid-columns:${i}`:"";return l`
      <div class="${o}" style="${n}">
        ${e.map(c=>l`
            <hm-task-tile
              .hass=${this.hass}
              .task=${c}
              .progressType=${r}
              .viewMode=${t}
            ></hm-task-tile>
          `)}
      </div>
    `}_columns(){return this._config?.columns??3}};E.styles=Kt,m([v({attribute:!1})],E.prototype,"hass",void 0),m([T()],E.prototype,"_config",void 0),m([T()],E.prototype,"_activeFilter",void 0),E=m([R(we)],E);var Je;(function(s){s.language="language",s.system="system",s.comma_decimal="comma_decimal",s.decimal_comma="decimal_comma",s.space_comma="space_comma",s.none="none"})(Je||(Je={}));var Ye;(function(s){s.language="language",s.system="system",s.am_pm="12",s.twenty_four="24"})(Ye||(Ye={}));const se=(s,e,t,r)=>{r=r||{},t=t??{};const i=new Event(e,{bubbles:r.bubbles===void 0?!0:r.bubbles,cancelable:!!r.cancelable,composed:r.composed===void 0?!0:r.composed});return i.detail=t,s.dispatchEvent(i),i};let z=class extends ${constructor(){super(...arguments),this._openSection="general"}setConfig(e){this._config={...e}}render(){return!this.hass||!this._config?l``:l`
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
        naturalMenuWidth
        .label=${d("editor.view_mode")}
        .value=${e.view_mode??g.view_mode}
        .configValue=${"view_mode"}
        @selected=${this._valueChanged}
        @closed=${t=>t.stopPropagation()}
      >
        <mwc-list-item value="grid">${d("editor.grid")}</mwc-list-item>
        <mwc-list-item value="list">${d("editor.list")}</mwc-list-item>
        <mwc-list-item value="compact">${d("editor.compact")}</mwc-list-item>
      </ha-select>

      <ha-select
        naturalMenuWidth
        .label=${d("editor.progress_type")}
        .value=${e.progress_type??g.progress_type}
        .configValue=${"progress_type"}
        @selected=${this._valueChanged}
        @closed=${t=>t.stopPropagation()}
      >
        <mwc-list-item value="ring">${d("editor.ring")}</mwc-list-item>
        <mwc-list-item value="bar">${d("editor.bar")}</mwc-list-item>
      </ha-select>
    `}_renderEntities(){return l`
      <p style="color:var(--secondary-text-color);font-size:13px;margin:0 0 12px 0;">
        ${d("editor.auto_discover")}
      </p>
    `}_renderDisplay(){const e=this._config;return l`
      <ha-select
        naturalMenuWidth
        .label=${d("editor.sort_by")}
        .value=${e.sort_by??g.sort_by}
        .configValue=${"sort_by"}
        @selected=${this._valueChanged}
        @closed=${t=>t.stopPropagation()}
      >
        <mwc-list-item value="urgency">${d("editor.urgency")}</mwc-list-item>
        <mwc-list-item value="name">${d("editor.name")}</mwc-list-item>
        <mwc-list-item value="due_date">${d("editor.due_date")}</mwc-list-item>
      </ha-select>

      <ha-select
        naturalMenuWidth
        .label=${d("editor.filter")}
        .value=${e.filter??g.filter}
        .configValue=${"filter"}
        @selected=${this._valueChanged}
        @closed=${t=>t.stopPropagation()}
      >
        <mwc-list-item value="all">${d("editor.all")}</mwc-list-item>
        <mwc-list-item value="overdue">${d("card.overdue")}</mwc-list-item>
        <mwc-list-item value="due_soon">${d("card.due_soon")}</mwc-list-item>
        <mwc-list-item value="on_track">${d("card.on_track")}</mwc-list-item>
      </ha-select>

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
          @click=${o=>{o.stopPropagation(),this._openSection=this._openSection===e?"":e}}
          aria-expanded=${i}
        >
          <span>${t}</span>
          <ha-icon .icon=${i?"mdi:chevron-up":"mdi:chevron-down"}></ha-icon>
        </button>
        <div class="accordion__body">
          <div class="accordion__content">${r}</div>
        </div>
      </div>
    `}_valueChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;if(!r)return;const i=t.value;this._config[r]!==i&&(this._config={...this._config,[r]:i===""?void 0:i},se(this,"config-changed",{config:this._config}))}_numChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;if(!r)return;const i=parseInt(t.value,10);isNaN(i)||(this._config={...this._config,[r]:i},se(this,"config-changed",{config:this._config}))}_boolChanged(e){if(!this._config)return;const t=e.target,r=t.configValue;r&&(this._config={...this._config,[r]:t.checked},se(this,"config-changed",{config:this._config}))}static get styles(){return O`
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
        overflow: hidden;
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
        overflow: hidden;
        padding: 0 16px;
      }
      .accordion--open .accordion__content {
        padding: 16px;
      }
    `}};m([v({attribute:!1})],z.prototype,"hass",void 0),m([T()],z.prototype,"_config",void 0),m([T()],z.prototype,"_openSection",void 0),z=m([R(xt)],z);var Zt=Object.freeze({__proto__:null,get HomeMaintenanceCardEditor(){return z}});export{E as HomeMaintenanceCard};
