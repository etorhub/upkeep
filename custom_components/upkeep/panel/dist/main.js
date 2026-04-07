function m(r,t,e,s){var i=arguments.length,o=i<3?t:s===null?s=Object.getOwnPropertyDescriptor(t,e):s,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(r,t,e,s);else for(var l=r.length-1;l>=0;l--)(n=r[l])&&(o=(i<3?n(o):i>3?n(t,e,o):n(t,e))||o);return i>3&&o&&Object.defineProperty(t,e,o),o}typeof SuppressedError=="function"&&SuppressedError;const M=globalThis,j=M.ShadowRoot&&(M.ShadyCSS===void 0||M.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,D=Symbol(),Z=new WeakMap;let J=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==D)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(j&&t===void 0){const s=e!==void 0&&e.length===1;s&&(t=Z.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Z.set(e,t))}return t}toString(){return this.cssText}};const ht=r=>new J(typeof r=="string"?r:r+"",void 0,D),dt=(r,...t)=>{const e=r.length===1?r[0]:t.reduce((s,i,o)=>s+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[o+1],r[0]);return new J(e,r,D)},ct=(r,t)=>{if(j)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const s=document.createElement("style"),i=M.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},K=j?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return ht(e)})(r):r;const{is:pt,defineProperty:ut,getOwnPropertyDescriptor:_t,getOwnPropertyNames:ft,getOwnPropertySymbols:$t,getPrototypeOf:mt}=Object,H=globalThis,G=H.trustedTypes,gt=G?G.emptyScript:"",vt=H.reactiveElementPolyfillSupport,E=(r,t)=>r,N={toAttribute(r,t){switch(t){case Boolean:r=r?gt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},L=(r,t)=>!pt(r,t),Q={attribute:!0,type:String,converter:N,reflect:!1,useDefault:!1,hasChanged:L};Symbol.metadata??=Symbol("metadata"),H.litPropertyMetadata??=new WeakMap;let A=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Q){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&ut(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:o}=_t(this.prototype,t)??{get(){return this[e]},set(n){this[e]=n}};return{get:i,set(n){const l=i?.call(this);o?.call(this,n),this.requestUpdate(t,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Q}static _$Ei(){if(this.hasOwnProperty(E("elementProperties")))return;const t=mt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(E("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(E("properties"))){const e=this.properties,s=[...ft(e),...$t(e)];for(const i of s)this.createProperty(i,e[i])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(const[e,s]of this.elementProperties){const i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const i of s)e.unshift(K(i))}else t!==void 0&&e.push(K(t));return e}static _$Eu(t,e){const s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ct(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){const o=(s.converter?.toAttribute!==void 0?s.converter:N).toAttribute(e,s.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){const o=s.getPropertyOptions(i),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:N;this._$Em=i;const l=n.fromAttribute(e,o.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(t,e,s,i=!1,o){if(t!==void 0){const n=this.constructor;if(i===!1&&(o=this[t]),s??=n.getPropertyOptions(t),!((s.hasChanged??L)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),o!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[i,o]of s){const{wrapped:n}=o,l=this[i];n!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,o,l)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[E("elementProperties")]=new Map,A[E("finalized")]=new Map,vt?.({ReactiveElement:A}),(H.reactiveElementVersions??=[]).push("2.1.2");const B=globalThis,X=r=>r,z=B.trustedTypes,Y=z?z.createPolicy("lit-html",{createHTML:r=>r}):void 0,tt="$lit$",g=`lit$${Math.random().toFixed(9).slice(2)}$`,et="?"+g,yt=`<${et}>`,v=document,k=()=>v.createComment(""),S=r=>r===null||typeof r!="object"&&typeof r!="function",q=Array.isArray,bt=r=>q(r)||typeof r?.[Symbol.iterator]=="function",F=`[ 	
\f\r]`,C=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,st=/-->/g,it=/>/g,y=RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),rt=/'/g,ot=/"/g,nt=/^(?:script|style|textarea|title)$/i,At=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),u=At(1),x=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),at=new WeakMap,b=v.createTreeWalker(v,129);function lt(r,t){if(!q(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Y!==void 0?Y.createHTML(t):t}const xt=(r,t)=>{const e=r.length-1,s=[];let i,o=t===2?"<svg>":t===3?"<math>":"",n=C;for(let l=0;l<e;l++){const a=r[l];let c,p,h=-1,f=0;for(;f<a.length&&(n.lastIndex=f,p=n.exec(a),p!==null);)f=n.lastIndex,n===C?p[1]==="!--"?n=st:p[1]!==void 0?n=it:p[2]!==void 0?(nt.test(p[2])&&(i=RegExp("</"+p[2],"g")),n=y):p[3]!==void 0&&(n=y):n===y?p[0]===">"?(n=i??C,h=-1):p[1]===void 0?h=-2:(h=n.lastIndex-p[2].length,c=p[1],n=p[3]===void 0?y:p[3]==='"'?ot:rt):n===ot||n===rt?n=y:n===st||n===it?n=C:(n=y,i=void 0);const $=n===y&&r[l+1].startsWith("/>")?" ":"";o+=n===C?a+yt:h>=0?(s.push(c),a.slice(0,h)+tt+a.slice(h)+g+$):a+g+(h===-2?l:$)}return[lt(r,o+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]};class U{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,n=0;const l=t.length-1,a=this.parts,[c,p]=xt(t,e);if(this.el=U.createElement(c,s),b.currentNode=this.el.content,e===2||e===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=b.nextNode())!==null&&a.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(const h of i.getAttributeNames())if(h.endsWith(tt)){const f=p[n++],$=i.getAttribute(h).split(g),R=/([.?@])?(.*)/.exec(f);a.push({type:1,index:o,name:R[2],strings:$,ctor:R[1]==="."?Et:R[1]==="?"?kt:R[1]==="@"?St:I}),i.removeAttribute(h)}else h.startsWith(g)&&(a.push({type:6,index:o}),i.removeAttribute(h));if(nt.test(i.tagName)){const h=i.textContent.split(g),f=h.length-1;if(f>0){i.textContent=z?z.emptyScript:"";for(let $=0;$<f;$++)i.append(h[$],k()),b.nextNode(),a.push({type:2,index:++o});i.append(h[f],k())}}}else if(i.nodeType===8)if(i.data===et)a.push({type:2,index:o});else{let h=-1;for(;(h=i.data.indexOf(g,h+1))!==-1;)a.push({type:7,index:o}),h+=g.length-1}o++}}static createElement(t,e){const s=v.createElement("template");return s.innerHTML=t,s}}function w(r,t,e=r,s){if(t===x)return t;let i=s!==void 0?e._$Co?.[s]:e._$Cl;const o=S(t)?void 0:t._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??=[])[s]=i:e._$Cl=i),i!==void 0&&(t=w(r,i._$AS(r,t.values),i,s)),t}class wt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??v).importNode(e,!0);b.currentNode=i;let o=b.nextNode(),n=0,l=0,a=s[0];for(;a!==void 0;){if(n===a.index){let c;a.type===2?c=new O(o,o.nextSibling,this,t):a.type===1?c=new a.ctor(o,a.name,a.strings,this,t):a.type===6&&(c=new Ct(o,this,t)),this._$AV.push(c),a=s[++l]}n!==a?.index&&(o=b.nextNode(),n++)}return b.currentNode=v,i}p(t){let e=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class O{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=w(this,t,e),S(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==x&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):bt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&S(this._$AH)?this._$AA.nextSibling.data=t:this.T(v.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=U.createElement(lt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const o=new wt(i,this),n=o.u(this.options);o.p(e),this.T(n),this._$AH=o}}_$AC(t){let e=at.get(t.strings);return e===void 0&&at.set(t.strings,e=new U(t)),e}k(t){q(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const o of t)i===e.length?e.push(s=new O(this.O(k()),this.O(k()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const s=X(t).nextSibling;X(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class I{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,i){const o=this.strings;let n=!1;if(o===void 0)t=w(this,t,e,0),n=!S(t)||t!==this._$AH&&t!==x,n&&(this._$AH=t);else{const l=t;let a,c;for(t=o[0],a=0;a<o.length-1;a++)c=w(this,l[s+a],e,a),c===x&&(c=this._$AH[a]),n||=!S(c)||c!==this._$AH[a],c===d?t=d:t!==d&&(t+=(c??"")+o[a+1]),this._$AH[a]=c}n&&!i&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Et extends I{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}}class kt extends I{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}}class St extends I{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=w(this,t,e,0)??d)===x)return;const s=this._$AH,i=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==d&&(s===d||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Ct{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){w(this,t)}}const Pt=B.litHtmlPolyfillSupport;Pt?.(U,O),(B.litHtmlVersions??=[]).push("3.3.2");const Tt=(r,t,e)=>{const s=e?.renderBefore??t;let i=s._$litPart$;if(i===void 0){const o=e?.renderBefore??null;s._$litPart$=i=new O(t.insertBefore(k(),o),o,void 0,e??{})}return i._$AI(r),i};const W=globalThis;class P extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Tt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return x}}P._$litElement$=!0,P.finalized=!0,W.litElementHydrateSupport?.({LitElement:P});const Ut=W.litElementPolyfillSupport;Ut?.({LitElement:P}),(W.litElementVersions??=[]).push("4.2.2");const Ot=r=>(t,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(r,t)}):customElements.define(r,t)};const Rt={attribute:!0,type:String,converter:N,reflect:!1,hasChanged:L},Mt=(r=Rt,t,e)=>{const{kind:s,metadata:i}=e;let o=globalThis.litPropertyMetadata.get(i);if(o===void 0&&globalThis.litPropertyMetadata.set(i,o=new Map),s==="setter"&&((r=Object.create(r)).wrapped=!0),o.set(e.name,r),s==="accessor"){const{name:n}=e;return{set(l){const a=t.get.call(this);t.set.call(this,l),this.requestUpdate(n,a,r,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,r,l),l}}}if(s==="setter"){const{name:n}=e;return function(l){const a=this[n];t.call(this,l),this.requestUpdate(n,a,r,!0,l)}}throw Error("Unsupported decorator location: "+s)};function V(r){return(t,e)=>typeof e=="object"?Mt(r,t,e):((s,i,o)=>{const n=i.hasOwnProperty(o);return i.constructor.createProperty(o,s),n?Object.getOwnPropertyDescriptor(i,o):void 0})(r,t,e)}function T(r){return V({...r,state:!0,attribute:!1})}let _=class extends P{constructor(){super(...arguments),this.narrow=!1,this._tasks=[],this._loading=!0,this._error=null,this._showAddForm=!1,this._filter="all",this._loadRequestId=0,this._submitAdd=async()=>{const t=this.shadowRoot?.getElementById("add-title"),e=this.shadowRoot?.getElementById("add-interval"),s=this.shadowRoot?.getElementById("add-period"),i=t?.value?.trim();if(!i)return;const o=parseInt(e?.value??"90",10)||90,n=s?.value??"days";try{await this._sendCommand({type:"upkeep/add_task",title:i,interval_value:o,interval_type:n}),this._showAddForm=!1,this._refresh()}catch(l){this._error=l.message}},this._incrementTask=async t=>{try{await this._sendCommand({type:"upkeep/increment_counter",task_id:t.id}),this._refresh()}catch(e){this._error=e.message}},this._completeTask=async t=>{try{await this._sendCommand({type:"upkeep/complete_task",task_id:t.id}),this._refresh()}catch(e){this._error=e.message}},this._snoozeTask=async t=>{try{await this._sendCommand({type:"upkeep/snooze_task",task_id:t.id,disable:!0}),this._refresh()}catch(e){this._error=e.message}},this._enableTask=async t=>{try{await this._sendCommand({type:"upkeep/enable_task",task_id:t.id}),this._refresh()}catch(e){this._error=e.message}},this._deleteTask=async t=>{if(confirm(`Delete "${t.title}"?`))try{await this._sendCommand({type:"upkeep/remove_task",task_id:t.id}),this._refresh()}catch(e){this._error=e.message}}}updated(t){t.has("hass")&&this.hass?.connection&&!this._showAddForm&&this._loadTasks()}connectedCallback(){super.connectedCallback(),this.hass?.connection&&this._loadTasks()}_loadTasks(t){if(!this.hass?.connection)return;const e=!t?.silent;e&&(this._loading=!0);const s=++this._loadRequestId;this.hass.connection.sendMessagePromise({type:"upkeep/get_tasks"}).then(i=>{if(s!==this._loadRequestId)return;const o=i;this._tasks=o.result??[],e&&(this._loading=!1),this._error=null}).catch(i=>{s===this._loadRequestId&&(e&&(this._loading=!1),this._error=i?.message??"Failed to load tasks")})}async _sendCommand(t){return this.hass.connection.sendMessagePromise(t)}_refresh(){this._loadTasks({silent:!0})}_getTaskEntityId(t){return t.entity_id??null}_filteredTasks(){const t=this.hass.states;return this._tasks.filter(e=>{if(this._filter==="snoozed")return!e.enabled;const s=this._getTaskEntityId(e);if(!s)return!0;const i=t[s];if(!i?.attributes)return!0;const o=i.attributes.urgency;return this._filter==="all"?!0:this._filter==="overdue"?o==="overdue":this._filter==="due_soon"?o==="due_soon":this._filter==="on_track"?o==="on_track":!0})}render(){if(!this.hass)return u`<div class="panel">Loading...</div>`;const t=this._filteredTasks();return u`
      <div class="panel">
        <div class="header">
          <h1>Upkeep</h1>
          <div class="header-actions">
            <div class="filter-bar">
              ${["all","overdue","due_soon","on_track","snoozed"].map(e=>u`
                  <button
                    class="filter-chip ${this._filter===e?"active":""}"
                    @click=${()=>{this._filter=e}}
                  >
                    ${e.replace("_"," ")}
                  </button>
                `)}
            </div>
            <ha-button @click=${()=>{this._showAddForm=!this._showAddForm}}>
              ${this._showAddForm?"Cancel":"Add Task"}
            </ha-button>
          </div>
        </div>

        ${this._error?u`<div class="error">${this._error}</div>`:d}
        ${this._loading?u`<div class="loading">Loading tasks...</div>`:d}

        ${this._showAddForm?this._renderAddForm():d}

        <div class="task-list">
          ${t.length===0&&!this._loading?u`<div class="empty">No tasks. Click "Add Task" to create one.</div>`:t.map(e=>this._renderTask(e))}
        </div>
      </div>
    `}_renderAddForm(){return u`
      <div class="add-form">
        <h3>Add Task</h3>
        <div class="form-row">
          <ha-textfield label="Title" id="add-title" .value=${""}></ha-textfield>
        </div>
        <div class="form-row">
          <ha-textfield label="Interval (e.g. 90)" type="number" id="add-interval" .value=${"90"}></ha-textfield>
          <label class="period-select-label">
            <span>Period</span>
            <select id="add-period">
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <ha-textfield label="Description (optional)" id="add-desc"></ha-textfield>
        </div>
        <div class="form-actions">
          <ha-button @click=${this._submitAdd}>Add Task</ha-button>
        </div>
      </div>
    `}_renderTask(t){const e=this._getTaskEntityId(t),s=e?this.hass.states[e]:null,i=s?.attributes?.urgency??"on_track",o=s?.attributes?.days_remaining??0,n=!t.enabled;return u`
      <div class="task-row ${i} ${n?"snoozed":""}">
        <div class="task-info">
          <ha-icon .icon=${t.icon||"mdi:calendar-check"}></ha-icon>
          <div>
            <div class="task-title">${t.title}</div>
            <div class="task-meta">
              ${t.task_type==="frequency"?u`${t.current_count??0} / ${t.frequency_target??0} uses`:u`${i} · ${o} days left`}
            </div>
          </div>
        </div>
        <div class="task-actions">
          ${n?u`<ha-button @click=${()=>this._enableTask(t)}>Enable</ha-button>`:u`
                <ha-button @click=${()=>this._completeTask(t)}>Complete</ha-button>
                ${t.task_type==="frequency"?u`<ha-button @click=${()=>this._incrementTask(t)}>+1</ha-button>`:d}
                <ha-button @click=${()=>this._snoozeTask(t)}>Snooze</ha-button>
              `}
          <ha-icon-button @click=${()=>this._deleteTask(t)}>
            <ha-icon icon="mdi:delete"></ha-icon>
          </ha-icon-button>
        </div>
      </div>
    `}static get styles(){return dt`
      .panel {
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .filter-bar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .filter-chip {
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 12px;
        cursor: pointer;
      }
      .filter-chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
      }
      .add-form {
        background: var(--card-background-color);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid var(--divider-color);
      }
      .add-form h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }
      .form-row {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }
      .form-row ha-textfield,
      .form-row ha-select {
        flex: 1;
      }
      .period-select-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .period-select-label select {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        padding: 0 12px;
        font-size: 14px;
      }
      .form-actions {
        margin-top: 12px;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .task-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--card-background-color);
        border-radius: 12px;
        border: 1px solid var(--divider-color);
      }
      .task-row.overdue {
        border-color: var(--error-color);
      }
      .task-row.due_soon {
        border-color: var(--warning-color);
      }
      .task-row.snoozed {
        opacity: 0.7;
      }
      .task-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .task-info ha-icon {
        --mdc-icon-size: 24px;
      }
      .task-title {
        font-weight: 500;
        font-size: 14px;
      }
      .task-meta {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .task-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .error {
        color: var(--error-color);
        padding: 12px;
        margin-bottom: 12px;
      }
      .loading {
        padding: 12px;
        color: var(--secondary-text-color);
      }
      .empty {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `}};m([V({attribute:!1})],_.prototype,"hass",void 0),m([V({type:Boolean})],_.prototype,"narrow",void 0),m([T()],_.prototype,"_tasks",void 0),m([T()],_.prototype,"_loading",void 0),m([T()],_.prototype,"_error",void 0),m([T()],_.prototype,"_showAddForm",void 0),m([T()],_.prototype,"_filter",void 0),_=m([Ot("upkeep-panel")],_);export{_ as UpkeepPanel};
