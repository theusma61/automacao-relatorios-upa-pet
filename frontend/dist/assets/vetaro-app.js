(function() {
  const modules = {};
  const cache = {};
  function resolvePath(base, target) {
    if (!target.startsWith(".")) return target;
    const baseParts = base.split("/").slice(0, -1);
    const targetParts = target.split("/");
    for (const p of targetParts) {
      if (p === "." || p === "") continue;
      if (p === "..") baseParts.pop();
      else baseParts.push(p);
    }
    return "./" + baseParts.filter(Boolean).join("/").replace(/\.(jsx|js)$/, "");
  }
  function requireMod(fromMod, id) {
    if (id === "react") return window.React;
    if (id === "react-dom/client") return window.ReactDOMClient || window.ReactDOM;
    if (id === "lucide-react") return window.LucideReact;
    if (id.endsWith(".css")) return {};
    const resolved = resolvePath(fromMod, id);
    if (cache[resolved]) return cache[resolved].exports;
    if (!modules[resolved]) throw new Error("Module not found: " + resolved + " (from " + fromMod + ")");
    const mod = { exports: {} };
    cache[resolved] = mod;
    modules[resolved](function(childId) { return requireMod(resolved, childId); }, mod, mod.exports);
    return mod.exports;
  }
  modules["./App"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = App;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("./components/icons/VetaroIcons");
var _ThemeContext = require("./context/ThemeContext");
var _AuthContext = require("./context/AuthContext");
var _api = require("./services/api");
var _Sidebar = _interopRequireDefault(require("./components/layout/Sidebar"));
var _MobileTabBar = _interopRequireDefault(require("./components/layout/MobileTabBar"));
var _TopHeader = _interopRequireDefault(require("./components/layout/TopHeader"));
var _ProfileDropdown = _interopRequireDefault(require("./components/layout/ProfileDropdown"));
var _Toast = _interopRequireDefault(require("./components/layout/Toast"));
var _ReportPreviewModal = _interopRequireDefault(require("./components/modals/ReportPreviewModal"));
var _AdminUsersModal = _interopRequireDefault(require("./components/modals/AdminUsersModal"));
var _LoginPage = _interopRequireDefault(require("./pages/LoginPage"));
var _DashboardHome = _interopRequireDefault(require("./pages/DashboardHome"));
var _UltrasoundGenerator = _interopRequireDefault(require("./pages/UltrasoundGenerator"));
var _SurgeryGenerator = _interopRequireDefault(require("./pages/SurgeryGenerator"));
var _SettingsPage = _interopRequireDefault(require("./pages/SettingsPage"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function formatDatePtBr(dateInput) {
  if (!dateInput) return '';
  try {
    var d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return "Gerado em ".concat(String(d.getDate()).padStart(2, '0'), "/").concat(String(d.getMonth() + 1).padStart(2, '0'), "/").concat(d.getFullYear(), " \xE0s ").concat(String(d.getHours()).padStart(2, '0'), ":").concat(String(d.getMinutes()).padStart(2, '0'));
  } catch (_) {
    return String(dateInput);
  }
}
function App() {
  var _useTheme = (0, _ThemeContext.useTheme)(),
    darkMode = _useTheme.darkMode,
    setDarkMode = _useTheme.setDarkMode;
  var _useAuth = (0, _AuthContext.useAuth)(),
    usuario = _useAuth.usuario,
    ssoConfig = _useAuth.ssoConfig,
    carregandoSessao = _useAuth.carregandoSessao,
    loginComGoogleCredential = _useAuth.loginComGoogleCredential,
    atualizarUsuarioLocal = _useAuth.atualizarUsuarioLocal,
    logout = _useAuth.logout;
  var _useState = (0, _react.useState)('inicio'),
    _useState2 = _slicedToArray(_useState, 2),
    activeNav = _useState2[0],
    setActiveNav = _useState2[1];
  var _useState3 = (0, _react.useState)('perfil'),
    _useState4 = _slicedToArray(_useState3, 2),
    settingsTab = _useState4[0],
    setSettingsTab = _useState4[1];
  var _useState5 = (0, _react.useState)(false),
    _useState6 = _slicedToArray(_useState5, 2),
    profileMenuOpen = _useState6[0],
    setProfileMenuOpen = _useState6[1];
  var _useState7 = (0, _react.useState)(false),
    _useState8 = _slicedToArray(_useState7, 2),
    adminModalOpen = _useState8[0],
    setAdminModalOpen = _useState8[1];
  var _useState9 = (0, _react.useState)(typeof window !== 'undefined' ? window.innerWidth : 1280),
    _useState10 = _slicedToArray(_useState9, 2),
    screenWidth = _useState10[0],
    setScreenWidth = _useState10[1];
  (0, _react.useEffect)(function () {
    var handleResize = function handleResize() {
      return setScreenWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return function () {
      return window.removeEventListener('resize', handleResize);
    };
  }, []);
  var _useState11 = (0, _react.useState)([]),
    _useState12 = _slicedToArray(_useState11, 2),
    activities = _useState12[0],
    setActivities = _useState12[1];
  var _useState13 = (0, _react.useState)(false),
    _useState14 = _slicedToArray(_useState13, 2),
    loadingHistory = _useState14[0],
    setLoadingHistory = _useState14[1];
  var _useState15 = (0, _react.useState)(null),
    _useState16 = _slicedToArray(_useState15, 2),
    selectedReport = _useState16[0],
    setSelectedReport = _useState16[1];
  var _useState17 = (0, _react.useState)(null),
    _useState18 = _slicedToArray(_useState17, 2),
    toastMessage = _useState18[0],
    setToastMessage = _useState18[1];
  var _useState19 = (0, _react.useState)({
      headerStyle: 'Logotipo + CRMV Centralizado',
      gridColumns: '2 colunas (6 fotos por página)',
      autoCalipers: true
    }),
    _useState20 = _slicedToArray(_useState19, 2),
    layoutConfig = _useState20[0],
    setLayoutConfig = _useState20[1];
  var showToast = (0, _react.useCallback)(function (msg) {
    setToastMessage(msg);
    setTimeout(function () {
      return setToastMessage(null);
    }, 3200);
  }, []);
  var carregarHistoricoServidor = (0, _react.useCallback)( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var res, exames, cirurgias, mappedExames, mappedCirurgias, combined;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (usuario) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return");
        case 2:
          setLoadingHistory(true);
          _context.prev = 3;
          _context.next = 6;
          return _api.api.getHistorico();
        case 6:
          res = _context.sent;
          exames = Array.isArray(res.exames) ? res.exames : [];
          cirurgias = Array.isArray(res.cirurgias) ? res.cirurgias : [];
          mappedExames = exames.map(function (ex) {
            return {
              id: "ex-".concat(ex.id),
              type: 'ultrassom',
              title: 'Laudo de Ultrassom',
              patient: "".concat(ex.pacienteNome || 'Paciente', " (").concat(ex.pacienteEspecie || 'Canina', ")"),
              tutor: ex.tutorNome || '',
              date: ex.criadoEm ? formatDatePtBr(ex.criadoEm) : "Gerado em ".concat(ex.dataExame || ''),
              timestamp: ex.criadoEm ? new Date(ex.criadoEm).getTime() : 0,
              status: 'Concluído',
              pdfUrl: ex.pdfArquivo || '',
              docxUrl: ex.docxArquivo || '',
              summary: Array.isArray(ex.laudoEstruturado) ? ex.laudoEstruturado.map(function (item) {
                return "\u2022 ".concat(item.orgao || '', ": ").concat(item.achados || '');
              }).join('\n') : "Laudo de Ultrassonografia Abdominal \u2014 Paciente ".concat(ex.pacienteNome, " (").concat(ex.imagensQtd || 0, " imagens).")
            };
          });
          mappedCirurgias = cirurgias.map(function (c) {
            var _c$dadosCirurgia;
            return {
              id: "cir-".concat(c.id),
              type: 'relatorio',
              title: "Relat\xF3rio Cir\xFArgico \u2014 ".concat(c.procedimento || 'Oficial'),
              patient: "".concat(c.pacienteNome || 'Paciente').concat(c.pacienteEspecie ? " (".concat(c.pacienteEspecie, ")") : ''),
              tutor: '',
              date: formatDatePtBr(c.criadoEm),
              timestamp: c.criadoEm ? new Date(c.criadoEm).getTime() : 0,
              status: 'Concluído',
              pdfUrl: c.pdfArquivo || '',
              docxUrl: c.docxArquivo || '',
              summary: ((_c$dadosCirurgia = c.dadosCirurgia) === null || _c$dadosCirurgia === void 0 ? void 0 : _c$dadosCirurgia.descricaoProcedimento) || "Procedimento: ".concat(c.procedimento || 'Cirurgia', "\nDiagn\xF3stico: ").concat(c.diagnostico || 'Padrão')
            };
          });
          combined = [].concat(_toConsumableArray(mappedExames), _toConsumableArray(mappedCirurgias)).sort(function (a, b) {
            return b.timestamp - a.timestamp;
          });
          setActivities(combined);
          _context.next = 18;
          break;
        case 15:
          _context.prev = 15;
          _context.t0 = _context["catch"](3);
          setActivities([]);
        case 18:
          _context.prev = 18;
          setLoadingHistory(false);
          return _context.finish(18);
        case 21:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[3, 15, 18, 21]]);
  })), [usuario]);
  (0, _react.useEffect)(function () {
    if (usuario) {
      carregarHistoricoServidor();
    }
  }, [carregarHistoricoServidor, usuario]);
  var openFromProfileMenu = function openFromProfileMenu(tab) {
    setActiveNav('configuracoes');
    setSettingsTab(tab);
    setProfileMenuOpen(false);
  };
  var handleAddActivity = function handleAddActivity(newAct) {
    setActivities(function (prev) {
      return [newAct].concat(_toConsumableArray(prev));
    });
  };
  var handleLogout = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            setProfileMenuOpen(false);
            _context2.next = 3;
            return logout();
          case 3:
            showToast('Sessão encerrada com segurança.');
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    return function handleLogout() {
      return _ref2.apply(this, arguments);
    };
  }();
  if (carregandoSessao) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      style: {
        fontFamily: "'Manrope', sans-serif"
      },
      className: "min-h-screen flex items-center justify-center ".concat(darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]')
    }, /*#__PURE__*/_react["default"].createElement("div", {
      className: "flex flex-col items-center gap-3"
    }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
      size: 38,
      dark: darkMode
    }), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-xs font-bold text-slate-400 animate-pulse"
    }, "Verificando sess\xE3o...")));
  }
  if (!usuario) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_LoginPage["default"], {
      darkMode: darkMode,
      setDarkMode: setDarkMode,
      ssoConfig: ssoConfig,
      onGoogleCredential: loginComGoogleCredential,
      onToast: showToast
    }), /*#__PURE__*/_react["default"].createElement(_Toast["default"], {
      message: toastMessage
    }));
  }
  var isMobile = screenWidth < 768;
  var isTablet = screenWidth >= 768 && screenWidth < 1024;
  var podeEmitir = usuario.podeGerarLaudos || usuario.podeGerarCirurgia || usuario.role === 'admin' || usuario.role === 'veterinario';
  var renderMainScreenContent = function renderMainScreenContent() {
    if (activeNav === 'inicio') {
      return /*#__PURE__*/_react["default"].createElement(_DashboardHome["default"], {
        darkMode: darkMode,
        isTabletLayout: isTablet,
        isMobileLayout: isMobile,
        activities: activities,
        loadingHistory: loadingHistory,
        onRefreshHistory: carregarHistoricoServidor,
        onNavigate: function onNavigate(dest) {
          return setActiveNav(dest);
        },
        onSelectReport: function onSelectReport(rep) {
          return setSelectedReport(rep);
        }
      });
    }
    if (activeNav === 'ultrassom') {
      return /*#__PURE__*/_react["default"].createElement(_UltrasoundGenerator["default"], {
        darkMode: darkMode,
        userProfile: usuario,
        layoutConfig: layoutConfig,
        setLayoutConfig: setLayoutConfig,
        onOpenProfile: function onOpenProfile() {
          return openFromProfileMenu('perfil');
        },
        onNavigateHome: function onNavigateHome() {
          return setActiveNav('inicio');
        },
        onAddActivity: handleAddActivity,
        onToast: showToast
      });
    }
    if (activeNav === 'relatorio') {
      return /*#__PURE__*/_react["default"].createElement(_SurgeryGenerator["default"], {
        darkMode: darkMode,
        userProfile: usuario,
        layoutConfig: layoutConfig,
        onOpenProfile: function onOpenProfile() {
          return openFromProfileMenu('perfil');
        },
        onNavigateHome: function onNavigateHome() {
          return setActiveNav('inicio');
        },
        onAddActivity: handleAddActivity,
        onToast: showToast
      });
    }
    return /*#__PURE__*/_react["default"].createElement(_SettingsPage["default"], {
      darkMode: darkMode,
      setDarkMode: setDarkMode,
      isMobileLayout: isMobile,
      settingsTab: settingsTab,
      setSettingsTab: setSettingsTab,
      userProfile: usuario,
      setUserProfile: atualizarUsuarioLocal,
      activitiesCount: activities.length,
      onOpenAdminModal: function onOpenAdminModal() {
        return setAdminModalOpen(true);
      },
      onToast: showToast
    });
  };
  return /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      fontFamily: "'Manrope', sans-serif"
    },
    onClick: function onClick() {
      return profileMenuOpen && setProfileMenuOpen(false);
    },
    className: "min-h-screen transition-colors duration-300 flex ".concat(isMobile ? 'flex-col justify-between' : 'flex-row', " ").concat(darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]')
  }, !isMobile && /*#__PURE__*/_react["default"].createElement(_Sidebar["default"], {
    darkMode: darkMode,
    activeNav: activeNav,
    setActiveNav: setActiveNav,
    compact: isTablet,
    showWindowDots: false,
    onHelpClick: function onHelpClick() {
      return showToast('Suporte Técnico Veterinário Vetaro disponível!');
    }
  }), /*#__PURE__*/_react["default"].createElement("main", {
    className: "flex-1 ".concat(isMobile ? 'p-4 pb-24' : isTablet ? 'p-6' : 'p-8 max-w-6xl', " flex flex-col relative overflow-y-auto")
  }, isMobile ? /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between mb-5 relative"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
    size: 26,
    dark: darkMode,
    textSize: "text-xl"
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return showToast('Nenhuma notificação pendente.');
    },
    className: "p-1.5 rounded-full relative"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Bell, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00D296]"
  })), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick(e) {
      e.stopPropagation();
      setProfileMenuOpen(!profileMenuOpen);
    },
    className: "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ".concat(darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white')
  }, usuario.initials)), profileMenuOpen && /*#__PURE__*/_react["default"].createElement(_ProfileDropdown["default"], {
    isStandalone: false,
    darkMode: darkMode,
    setDarkMode: setDarkMode,
    userProfile: usuario,
    activeNav: activeNav,
    settingsTab: settingsTab,
    onSelectTab: openFromProfileMenu,
    onOpenAdminModal: function onOpenAdminModal() {
      setProfileMenuOpen(false);
      setAdminModalOpen(true);
    },
    onLogout: handleLogout
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/_react["default"].createElement("h2", {
    className: "text-2xl font-extrabold"
  }, "Ol\xE1, ", usuario.greetingName, "!"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Tudo pronto para otimizar seu trabalho hoje?"))) : /*#__PURE__*/_react["default"].createElement(_TopHeader["default"], {
    darkMode: darkMode,
    setDarkMode: setDarkMode,
    userProfile: usuario,
    activeNav: activeNav,
    settingsTab: settingsTab,
    profileMenuOpen: profileMenuOpen,
    setProfileMenuOpen: setProfileMenuOpen,
    onSelectTab: openFromProfileMenu,
    onOpenAdminModal: function onOpenAdminModal() {
      setProfileMenuOpen(false);
      setAdminModalOpen(true);
    },
    onLogout: handleLogout,
    onBellClick: function onBellClick() {
      return showToast('Nenhuma notificação pendente.');
    },
    compact: isTablet
  }), !podeEmitir && /*#__PURE__*/_react["default"].createElement("div", {
    className: "mb-6 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.ShieldAlert, {
    className: "w-5 h-5 text-amber-400 shrink-0 mt-0.5"
  }), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("p", {
    className: "font-extrabold text-amber-300"
  }, "Acesso em Modo de Consulta / Aguardando Libera\xE7\xE3o"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "mt-0.5 opacity-90"
  }, "Voc\xEA est\xE1 conectado como ", /*#__PURE__*/_react["default"].createElement("strong", null, usuario.email), ", mas sua conta ainda n\xE3o possui permiss\xE3o para emitir laudos e relat\xF3rios oficiais."))), renderMainScreenContent()), isMobile && /*#__PURE__*/_react["default"].createElement("div", {
    className: "fixed bottom-0 left-0 right-0 z-30"
  }, /*#__PURE__*/_react["default"].createElement(_MobileTabBar["default"], {
    darkMode: darkMode,
    activeNav: activeNav,
    setActiveNav: setActiveNav
  })), /*#__PURE__*/_react["default"].createElement(_ReportPreviewModal["default"], {
    report: selectedReport,
    darkMode: darkMode,
    onClose: function onClose() {
      return setSelectedReport(null);
    },
    onToast: showToast
  }), /*#__PURE__*/_react["default"].createElement(_AdminUsersModal["default"], {
    darkMode: darkMode,
    isOpen: adminModalOpen,
    onClose: function onClose() {
      return setAdminModalOpen(false);
    },
    onToast: showToast
  }), /*#__PURE__*/_react["default"].createElement(_Toast["default"], {
    message: toastMessage
  }));
}
  };
  modules["./components/icons/VetaroIcons"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VetaroLogo = exports.UltrasoundIcon = exports.SurgicalFilePulseIcon = exports.PlanBoxIcon = exports.MoonStarIcon = exports.CloudUploadVetaroIcon = exports.CardWaveBackground = exports.CameraSolidIcon = exports.BRAND_COLORS = void 0;
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var CloudUploadVetaroIcon = function CloudUploadVetaroIcon(_ref) {
  var _ref$className = _ref.className,
    className = _ref$className === void 0 ? 'w-12 h-12' : _ref$className;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 48 48",
    fill: "none",
    className: className,
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/_react["default"].createElement("path", {
    d: "M34.5 36H15C9.75 36 5.5 31.85 5.5 26.6C5.5 21.85 9.05 17.9 13.65 17.3C15.5 11.35 21.05 7 27.6 7C35.65 7 42.2 13.55 42.2 21.6C42.2 22.15 42.15 22.7 42.08 23.22C44.72 24.75 46.5 27.6 46.5 30.9C46.5 35.92 42.42 36 37.4 36H34.5Z",
    fill: "currentColor",
    fillOpacity: "0.18",
    stroke: "currentColor",
    strokeWidth: "2.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M24 31V19M24 19L19 24M24 19L29 24",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
};
exports.CloudUploadVetaroIcon = CloudUploadVetaroIcon;
var SurgicalFilePulseIcon = function SurgicalFilePulseIcon(_ref2) {
  var _ref2$className = _ref2.className,
    className = _ref2$className === void 0 ? 'w-11 h-11' : _ref2$className;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 48 48",
    fill: "none",
    className: className,
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/_react["default"].createElement("path", {
    d: "M28 6H14C11.7909 6 10 7.79086 10 10V38C10 40.2091 11.7909 42 14 42H34C36.2091 42 38 40.2091 38 38V16L28 6Z",
    fill: "currentColor",
    fillOpacity: "0.18",
    stroke: "currentColor",
    strokeWidth: "2.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M28 6V16H38",
    stroke: "currentColor",
    strokeWidth: "2.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M14 29H18.5L21.5 23L25.5 33L28.5 27H34",
    stroke: "currentColor",
    strokeWidth: "2.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
};
exports.SurgicalFilePulseIcon = SurgicalFilePulseIcon;
var CameraSolidIcon = function CameraSolidIcon(_ref3) {
  var _ref3$className = _ref3.className,
    className = _ref3$className === void 0 ? 'w-7 h-7' : _ref3$className;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: className,
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/_react["default"].createElement("path", {
    d: "M9.4 4.5C8.87 4.5 8.37 4.78 8.1 5.24L7.05 7H4.5C3.12 7 2 8.12 2 9.5V18C2 19.38 3.12 20.5 4.5 20.5H19.5C20.88 20.5 22 19.38 22 18V9.5C22 8.12 20.88 7 19.5 7H16.95L15.9 5.24C15.63 4.78 15.13 4.5 14.6 4.5H9.4ZM12 17C9.79 17 8 15.21 8 13C8 10.79 9.79 9 12 9C14.21 9 16 10.79 16 13C16 15.21 14.21 17 12 17Z"
  }));
};
exports.CameraSolidIcon = CameraSolidIcon;
var VetaroLogo = function VetaroLogo(_ref4) {
  var _ref4$size = _ref4.size,
    size = _ref4$size === void 0 ? 32 : _ref4$size,
    _ref4$dark = _ref4.dark,
    dark = _ref4$dark === void 0 ? false : _ref4$dark,
    _ref4$showText = _ref4.showText,
    showText = _ref4$showText === void 0 ? true : _ref4$showText,
    _ref4$textSize = _ref4.textSize,
    textSize = _ref4$textSize === void 0 ? 'text-2xl' : _ref4$textSize;
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2.5 select-none"
  }, /*#__PURE__*/_react["default"].createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: "shrink-0"
  }, /*#__PURE__*/_react["default"].createElement("defs", null, /*#__PURE__*/_react["default"].createElement("linearGradient", {
    id: "vetGradL",
    x1: "6",
    y1: "8",
    x2: "24",
    y2: "42",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/_react["default"].createElement("stop", {
    offset: "0%",
    stopColor: "#00D296"
  }), /*#__PURE__*/_react["default"].createElement("stop", {
    offset: "100%",
    stopColor: "#0D5C56"
  })), /*#__PURE__*/_react["default"].createElement("linearGradient", {
    id: "vetGradR",
    x1: "42",
    y1: "8",
    x2: "22",
    y2: "40",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/_react["default"].createElement("stop", {
    offset: "0%",
    stopColor: "#00E6A4"
  }), /*#__PURE__*/_react["default"].createElement("stop", {
    offset: "100%",
    stopColor: "#097969"
  }))), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M9.5 14.5C7.8 11.3 9.2 7.5 12.6 6.5C15.4 5.7 18.4 7.2 19.7 9.9L26.8 25.2C28.3 28.4 27.1 32.3 24 34C20.8 35.8 16.7 34.5 15 31.3L9.5 14.5Z",
    fill: "url(#vetGradL)"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M38.5 14.5C40.2 11.3 38.8 7.5 35.4 6.5C32.6 5.7 29.6 7.2 28.3 9.9L18.2 31.2C16.7 34.4 17.9 38.3 21 40C24.2 41.8 28.3 40.5 30 37.3L38.5 14.5Z",
    fill: "url(#vetGradR)"
  })), showText && /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold tracking-tight ".concat(textSize, " ").concat(dark ? 'text-white' : 'text-[#0A141D]')
  }, "vetaro"));
};
exports.VetaroLogo = VetaroLogo;
var UltrasoundIcon = function UltrasoundIcon(_ref5) {
  var _ref5$className = _ref5.className,
    className = _ref5$className === void 0 ? 'w-6 h-6' : _ref5$className,
    _ref5$strokeWidth = _ref5.strokeWidth,
    strokeWidth = _ref5$strokeWidth === void 0 ? 2 : _ref5$strokeWidth;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className
  }, /*#__PURE__*/_react["default"].createElement("path", {
    d: "M4 15.5C6.5 13 9 13 12 15.5C15 18 17.5 18 20 15.5"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M6.5 12C8 9.2 10 8 12 8C14 8 16 9.2 17.5 12"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M3 18.5H21"
  }));
};
exports.UltrasoundIcon = UltrasoundIcon;
var PlanBoxIcon = function PlanBoxIcon(_ref6) {
  var _ref6$className = _ref6.className,
    className = _ref6$className === void 0 ? 'w-5 h-5' : _ref6$className;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className
  }, /*#__PURE__*/_react["default"].createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "16",
    rx: "3"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M3 9.5H21"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M10 14.5H14"
  }));
};
exports.PlanBoxIcon = PlanBoxIcon;
var MoonStarIcon = function MoonStarIcon(_ref7) {
  var _ref7$className = _ref7.className,
    className = _ref7$className === void 0 ? 'w-5 h-5' : _ref7$className;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className
  }, /*#__PURE__*/_react["default"].createElement("path", {
    d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M19 3v4"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M21 5h-4"
  }));
};
exports.MoonStarIcon = MoonStarIcon;
var CardWaveBackground = function CardWaveBackground(_ref8) {
  var dark = _ref8.dark;
  return /*#__PURE__*/_react["default"].createElement("svg", {
    className: "absolute right-0 top-0 h-full w-3/4 pointer-events-none select-none overflow-hidden rounded-2xl",
    viewBox: "0 0 300 220",
    fill: "none",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/_react["default"].createElement("circle", {
    cx: "255",
    cy: "35",
    r: "125",
    fill: "#00D296",
    fillOpacity: dark ? '0.07' : '0.13'
  }), /*#__PURE__*/_react["default"].createElement("circle", {
    cx: "285",
    cy: "165",
    r: "105",
    stroke: dark ? '#00D296' : '#0D5C56',
    strokeOpacity: dark ? '0.14' : '0.09',
    strokeWidth: "26"
  }), /*#__PURE__*/_react["default"].createElement("path", {
    d: "M140 -20 C190 60, 260 90, 320 70 L320 240 L120 240 Z",
    fill: dark ? '#0D5C56' : '#00D296',
    fillOpacity: dark ? '0.12' : '0.08'
  }));
};
exports.CardWaveBackground = CardWaveBackground;
var BRAND_COLORS = [{
  hex: '#00D296',
  name: 'Emerald Vetaro (Primária IA)',
  usage: 'Botões no modo escuro, destaques ativos, ícones e indicadores de IA'
}, {
  hex: '#0D5C56',
  name: 'Deep Teal (Institucional)',
  usage: 'Botões no modo claro, gradientes do logo e fundos secundários'
}, {
  hex: '#0A141D',
  name: 'Midnight Navy (Dark Background)',
  usage: 'Fundo principal do Modo Escuro e tipografia principal no Modo Claro'
}, {
  hex: '#637692',
  name: 'Clinical Slate (Texto Secundário & Avatar)',
  usage: 'Subtítulos, datas na tabela, bordas suaves e fundo do avatar MD'
}, {
  hex: '#F8FAFC',
  name: 'Pure Ice (Light Background)',
  usage: 'Fundo principal do Modo Claro, superfícies limpas e cartões'
}];
exports.BRAND_COLORS = BRAND_COLORS;
  };
  modules["./components/layout/MobileTabBar"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = MobileTabBar;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function MobileTabBar(_ref) {
  var darkMode = _ref.darkMode,
    activeNav = _ref.activeNav,
    setActiveNav = _ref.setActiveNav;
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "border-t py-3 px-6 flex items-center justify-around text-xs font-bold ".concat(darkMode ? 'bg-[#0C1720] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setActiveNav('inicio');
    },
    className: "flex flex-col items-center gap-1 ".concat(activeNav === 'inicio' ? 'text-[#00D296]' : '')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Home, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "In\xEDcio")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setActiveNav('ultrassom');
    },
    className: "flex flex-col items-center gap-1 ".concat(activeNav === 'ultrassom' || activeNav === 'relatorio' ? 'text-[#00D296]' : '')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileText, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Hist\xF3rico")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setActiveNav('configuracoes');
    },
    className: "flex flex-col items-center gap-1 ".concat(activeNav === 'configuracoes' ? 'text-[#00D296]' : '')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Settings, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Configura\xE7\xF5es")));
}
  };
  modules["./components/layout/ProfileDropdown"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ProfileDropdown;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../icons/VetaroIcons");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function ProfileDropdown(_ref) {
  var _ref$isStandalone = _ref.isStandalone,
    isStandalone = _ref$isStandalone === void 0 ? false : _ref$isStandalone,
    darkMode = _ref.darkMode,
    setDarkMode = _ref.setDarkMode,
    userProfile = _ref.userProfile,
    activeNav = _ref.activeNav,
    settingsTab = _ref.settingsTab,
    onSelectTab = _ref.onSelectTab,
    onOpenAdminModal = _ref.onOpenAdminModal,
    onLogout = _ref.onLogout;
  return /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "".concat(isStandalone ? 'w-72' : 'absolute right-0 top-14 w-72 z-50', " rounded-2xl border shadow-2xl overflow-hidden transition-all ").concat(darkMode ? 'bg-[#121E28] border-[#243647] text-white shadow-black/80' : 'bg-white border-slate-200 text-[#0A141D] shadow-slate-900/20')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-5 flex items-center gap-3.5"
  }, userProfile.foto ? /*#__PURE__*/_react["default"].createElement("img", {
    src: userProfile.foto,
    alt: userProfile.name,
    className: "w-12 h-12 rounded-full object-cover border border-[#00D296]/40 shrink-0"
  }) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-12 h-12 rounded-full bg-[#637692] text-white flex items-center justify-center font-bold text-base shrink-0"
  }, userProfile.initials || 'MD'), /*#__PURE__*/_react["default"].createElement("div", {
    className: "min-w-0 text-left"
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "font-bold text-base leading-tight truncate"
  }, userProfile.name), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs mt-0.5 truncate ".concat(darkMode ? 'text-slate-300/80' : 'text-slate-500')
  }, userProfile.email))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "h-px mx-4 ".concat(darkMode ? 'bg-slate-700/60' : 'bg-slate-200')
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-2.5 space-y-1"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onSelectTab('perfil');
    },
    className: "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ".concat(activeNav === 'configuracoes' && settingsTab === 'perfil' ? 'bg-[#00D296]/15 text-[#00D296]' : darkMode ? 'text-slate-100 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.User, {
    className: "w-5 h-5 stroke-[1.9]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Meu perfil")), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold"
  }, "Abrir")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onSelectTab('assinatura');
    },
    className: "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ".concat(activeNav === 'configuracoes' && settingsTab === 'assinatura' ? 'bg-[#00D296]/15 text-[#00D296]' : darkMode ? 'text-slate-100 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.PlanBoxIcon, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Plano e assinatura")), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold"
  }, "Abrir")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onSelectTab('preferencias');
    },
    className: "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ".concat(activeNav === 'configuracoes' && settingsTab === 'preferencias' ? 'bg-[#00D296]/15 text-[#00D296]' : darkMode ? 'text-slate-100 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Settings, {
    className: "w-5 h-5 stroke-[1.9]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Configura\xE7\xF5es")), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold"
  }, "Abrir")), userProfile.role === 'admin' && onOpenAdminModal && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onOpenAdminModal,
    className: "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ".concat(darkMode ? 'text-slate-100 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.ShieldCheck, {
    className: "w-5 h-5 stroke-[1.9] text-[#00D296]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Acessos (Admin)")), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold"
  }, "RBAC"))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "h-px mx-4 ".concat(darkMode ? 'bg-slate-700/60' : 'bg-slate-200')
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-2.5 space-y-1"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return setDarkMode(!darkMode);
    },
    className: "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ".concat(darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.MoonStarIcon, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Modo claro")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ".concat(!darkMode ? 'bg-[#00D296]' : 'bg-[#00A878]')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
    style: {
      transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
    }
  }))), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onLogout,
    className: "w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ".concat(darkMode ? 'text-slate-100 hover:bg-rose-500/15 hover:text-rose-300' : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.LogOut, {
    className: "w-5 h-5 stroke-[1.9]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Sair"))));
}
  };
  modules["./components/layout/Sidebar"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Sidebar;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../icons/VetaroIcons");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function Sidebar(_ref) {
  var darkMode = _ref.darkMode,
    activeNav = _ref.activeNav,
    setActiveNav = _ref.setActiveNav,
    _ref$compact = _ref.compact,
    compact = _ref$compact === void 0 ? false : _ref$compact,
    _ref$showWindowDots = _ref.showWindowDots,
    showWindowDots = _ref$showWindowDots === void 0 ? true : _ref$showWindowDots,
    onHelpClick = _ref.onHelpClick;
  var navItems = [{
    id: 'inicio',
    label: 'Início',
    icon: _lucideReact.Home
  }, {
    id: 'ultrassom',
    label: 'Ultrassom',
    icon: _VetaroIcons.UltrasoundIcon
  }, {
    id: 'relatorio',
    label: 'Relatório',
    icon: _lucideReact.FileText
  }, {
    id: 'configuracoes',
    label: 'Configurações',
    icon: _lucideReact.Settings
  }];
  return /*#__PURE__*/_react["default"].createElement("aside", {
    className: "".concat(compact ? 'w-52 p-5' : 'w-64 p-6', " shrink-0 border-r flex flex-col justify-between transition-colors ").concat(darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", null, showWindowDots && !compact && /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2 mb-6"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "w-3 h-3 rounded-full bg-[#FF5F56]"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "w-3 h-3 rounded-full bg-[#FFBD2E]"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "w-3 h-3 rounded-full bg-[#27C93F]"
  })), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return setActiveNav('inicio');
    },
    className: "cursor-pointer ".concat(compact ? 'mb-7' : 'mb-8', " inline-block")
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
    size: compact ? 26 : 34,
    dark: darkMode,
    textSize: compact ? 'text-xl' : 'text-2xl'
  })), /*#__PURE__*/_react["default"].createElement("nav", {
    className: "space-y-1.5"
  }, navItems.map(function (item) {
    var Icon = item.icon;
    var active = activeNav === item.id;
    return /*#__PURE__*/_react["default"].createElement("button", {
      key: item.id,
      type: "button",
      onClick: function onClick() {
        return setActiveNav(item.id);
      },
      className: "w-full flex items-center ".concat(compact ? 'gap-3 px-3.5 py-2.5 text-xs font-bold' : 'gap-3.5 px-4 py-3 text-sm font-semibold', " rounded-xl transition relative ").concat(active ? darkMode ? 'bg-[#0D3131] text-[#00D296]' : 'bg-[#DDF7F0] text-[#0D5C56]' : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')
    }, active && /*#__PURE__*/_react["default"].createElement("span", {
      className: "absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#00D296]"
    }), /*#__PURE__*/_react["default"].createElement(Icon, {
      className: compact ? 'w-4 h-4' : 'w-5 h-5'
    }), /*#__PURE__*/_react["default"].createElement("span", null, item.label));
  }))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onHelpClick,
    className: "w-full flex items-center justify-between ".concat(compact ? 'px-3 py-2.5 text-[11px]' : 'px-4 py-3 text-xs', " rounded-xl border font-semibold transition ").concat(darkMode ? 'border-slate-800 bg-[#0F1C26] text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.HelpCircle, {
    className: compact ? 'w-3.5 h-3.5 text-slate-400' : 'w-4 h-4 text-slate-400'
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Ajuda e suporte")), /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowUpRight, {
    className: "w-3.5 h-3.5 text-slate-400"
  })), /*#__PURE__*/_react["default"].createElement("p", {
    className: "".concat(compact ? 'text-[10px] mt-2' : 'text-[11px] mt-3', " text-slate-500 px-1")
  }, "v1.0.0")));
}
  };
  modules["./components/layout/Toast"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Toast;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function Toast(_ref) {
  var message = _ref.message;
  if (!message) return null;
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "fixed bottom-4 right-4 left-4 sm:left-auto z-50 bg-[#0D5C56] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#00D296]/40 flex items-center gap-2.5 text-xs font-bold"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.CheckCircle2, {
    className: "w-4 h-4 text-[#00D296] shrink-0"
  }), /*#__PURE__*/_react["default"].createElement("span", null, message));
}
  };
  modules["./components/layout/TopHeader"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = TopHeader;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
var _ProfileDropdown = _interopRequireDefault(require("./ProfileDropdown"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function TopHeader(_ref) {
  var darkMode = _ref.darkMode,
    setDarkMode = _ref.setDarkMode,
    userProfile = _ref.userProfile,
    activeNav = _ref.activeNav,
    settingsTab = _ref.settingsTab,
    profileMenuOpen = _ref.profileMenuOpen,
    setProfileMenuOpen = _ref.setProfileMenuOpen,
    onSelectTab = _ref.onSelectTab,
    onOpenAdminModal = _ref.onOpenAdminModal,
    onLogout = _ref.onLogout,
    onBellClick = _ref.onBellClick,
    _ref$compact = _ref.compact,
    compact = _ref$compact === void 0 ? false : _ref$compact;
  return /*#__PURE__*/_react["default"].createElement("header", {
    className: "flex items-start justify-between ".concat(compact ? 'mb-6' : 'mb-7', " relative")
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("h1", {
    className: "".concat(compact ? 'text-2xl' : 'text-3xl', " font-extrabold tracking-tight")
  }, "Ol\xE1, ", userProfile.greetingName, "!"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "".concat(compact ? 'text-xs mt-0.5' : 'text-sm mt-1', " font-medium ").concat(darkMode ? 'text-slate-400' : 'text-[#52657A]')
  }, "Tudo pronto para otimizar seu trabalho hoje?")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-3 sm:gap-4 relative"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onBellClick,
    className: "p-2 rounded-full hover:bg-slate-500/10 relative",
    title: "Notifica\xE7\xF5es"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Bell, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#00D296]"
  })), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setProfileMenuOpen(!profileMenuOpen);
    },
    className: "flex items-center gap-2"
  }, userProfile.foto ? /*#__PURE__*/_react["default"].createElement("img", {
    src: userProfile.foto,
    alt: userProfile.name,
    className: "".concat(compact ? 'w-9 h-9' : 'w-10 h-10', " rounded-full object-cover border border-[#00D296]/40")
  }) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "".concat(compact ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm', " rounded-full flex items-center justify-center font-bold ").concat(darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white')
  }, userProfile.initials || 'MD'), /*#__PURE__*/_react["default"].createElement(_lucideReact.ChevronDown, {
    className: "w-4 h-4"
  })), profileMenuOpen && /*#__PURE__*/_react["default"].createElement(_ProfileDropdown["default"], {
    isStandalone: false,
    darkMode: darkMode,
    setDarkMode: setDarkMode,
    userProfile: userProfile,
    activeNav: activeNav,
    settingsTab: settingsTab,
    onSelectTab: onSelectTab,
    onOpenAdminModal: onOpenAdminModal,
    onLogout: onLogout
  })));
}
  };
  modules["./components/modals/AdminUsersModal"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = AdminUsersModal;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _api = require("../../services/api");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function AdminUsersModal(_ref) {
  var darkMode = _ref.darkMode,
    isOpen = _ref.isOpen,
    onClose = _ref.onClose,
    onToast = _ref.onToast;
  var _useState = (0, _react.useState)([]),
    _useState2 = _slicedToArray(_useState, 2),
    usuarios = _useState2[0],
    setUsuarios = _useState2[1];
  var _useState3 = (0, _react.useState)(false),
    _useState4 = _slicedToArray(_useState3, 2),
    loading = _useState4[0],
    setLoading = _useState4[1];
  var carregarUsuarios = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var res;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            setLoading(true);
            _context.prev = 1;
            _context.next = 4;
            return _api.api.getAdminUsuarios();
          case 4:
            res = _context.sent;
            if (res && Array.isArray(res.usuarios)) {
              setUsuarios(res.usuarios);
            }
            _context.next = 11;
            break;
          case 8:
            _context.prev = 8;
            _context.t0 = _context["catch"](1);
            onToast('Aviso ao carregar usuários: ' + _context.t0.message);
          case 11:
            _context.prev = 11;
            setLoading(false);
            return _context.finish(11);
          case 14:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[1, 8, 11, 14]]);
    }));
    return function carregarUsuarios() {
      return _ref2.apply(this, arguments);
    };
  }();
  (0, _react.useEffect)(function () {
    if (isOpen) {
      carregarUsuarios();
    }
  }, [isOpen]);
  if (!isOpen) return null;
  var handleRoleChange = /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(email, novoCargo) {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return _api.api.updateAdminUserRole(email, novoCargo);
          case 3:
            onToast("Permiss\xF5es de ".concat(email, " atualizadas para: ").concat(novoCargo, "!"));
            _context2.next = 6;
            return carregarUsuarios();
          case 6:
            _context2.next = 11;
            break;
          case 8:
            _context2.prev = 8;
            _context2.t0 = _context2["catch"](0);
            onToast('Erro ao alterar permissão: ' + _context2.t0.message);
          case 11:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[0, 8]]);
    }));
    return function handleRoleChange(_x2, _x3) {
      return _ref3.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/_react["default"].createElement("div", {
    onClick: onClose,
    className: "fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "w-full max-w-2xl rounded-2xl border p-6 space-y-4 shadow-2xl ".concat(darkMode ? 'bg-[#121E28] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-700/40"
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.ShieldCheck, {
    className: "w-5 h-5 text-[#00D296]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Controle de Acessos e Permiss\xF5es (RBAC Multi-Tenant)")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "text-slate-400 hover:text-white font-bold px-2 py-1"
  }, "\u2715")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "max-h-96 overflow-y-auto"
  }, loading ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "py-8 text-center text-xs text-slate-400"
  }, "Carregando usu\xE1rios do PostgreSQL...") : usuarios.length === 0 ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "py-8 text-center text-xs text-slate-400"
  }, "Nenhum usu\xE1rio listado ou sess\xE3o em modo demonstra\xE7\xE3o.") : /*#__PURE__*/_react["default"].createElement("table", {
    className: "w-full text-left text-xs"
  }, /*#__PURE__*/_react["default"].createElement("thead", {
    className: "uppercase font-extrabold ".concat(darkMode ? 'bg-[#0A141D] text-slate-400' : 'bg-slate-50 text-slate-600')
  }, /*#__PURE__*/_react["default"].createElement("tr", null, /*#__PURE__*/_react["default"].createElement("th", {
    className: "p-2.5"
  }, "Usu\xE1rio"), /*#__PURE__*/_react["default"].createElement("th", {
    className: "p-2.5"
  }, "E-mail"), /*#__PURE__*/_react["default"].createElement("th", {
    className: "p-2.5"
  }, "Cargo / Papel"), /*#__PURE__*/_react["default"].createElement("th", {
    className: "p-2.5 text-right"
  }, "A\xE7\xE3o"))), /*#__PURE__*/_react["default"].createElement("tbody", {
    className: "divide-y divide-slate-700/30"
  }, usuarios.map(function (u) {
    return /*#__PURE__*/_react["default"].createElement("tr", {
      key: u.email,
      className: "hover:bg-white/5 transition"
    }, /*#__PURE__*/_react["default"].createElement("td", {
      className: "p-2.5 font-bold"
    }, u.nome), /*#__PURE__*/_react["default"].createElement("td", {
      className: "p-2.5 text-slate-400"
    }, u.email), /*#__PURE__*/_react["default"].createElement("td", {
      className: "p-2.5"
    }, /*#__PURE__*/_react["default"].createElement("span", {
      className: "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D296]/15 text-[#00D296]"
    }, u.roleDescricao || u.role)), /*#__PURE__*/_react["default"].createElement("td", {
      className: "p-2.5 text-right"
    }, /*#__PURE__*/_react["default"].createElement("select", {
      value: u.role,
      onChange: function onChange(e) {
        return handleRoleChange(u.email, e.target.value);
      },
      className: "text-xs border rounded-lg px-2 py-1 font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0A141D]')
    }, /*#__PURE__*/_react["default"].createElement("option", {
      value: "admin"
    }, "Administrador"), /*#__PURE__*/_react["default"].createElement("option", {
      value: "veterinario"
    }, "Veterin\xE1rio (Gera laudos)"), /*#__PURE__*/_react["default"].createElement("option", {
      value: "assistente"
    }, "Assistente (Consulta)"), /*#__PURE__*/_react["default"].createElement("option", {
      value: "pendente"
    }, "Bloqueado / Pendente"))));
  })))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
  }, "Fechar"))));
}
  };
  modules["./components/modals/LayoutEditorDrawer"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = LayoutEditorDrawer;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _api = require("../../services/api");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
var DEFAULT_LAYOUT = {
  font_family: 'Calibri, sans-serif',
  font_size_body: '11pt',
  font_size_titulo: '14pt',
  margin_top: '20mm',
  margin_bottom: '20mm',
  margin_left: '15mm',
  margin_right: '15mm',
  line_height: '1.4',
  paragraph_spacing: '8pt',
  cor_primaria: '#1B365D',
  cor_secundaria: '#4A777A'
};
function LayoutEditorDrawer(_ref) {
  var darkMode = _ref.darkMode,
    isOpen = _ref.isOpen,
    onClose = _ref.onClose,
    layoutConfig = _ref.layoutConfig,
    setLayoutConfig = _ref.setLayoutConfig,
    userProfile = _ref.userProfile,
    onToast = _ref.onToast;
  var _useState = (0, _react.useState)(false),
    _useState2 = _slicedToArray(_useState, 2),
    advancedOpen = _useState2[0],
    setAdvancedOpen = _useState2[1];
  var _useState3 = (0, _react.useState)(DEFAULT_LAYOUT),
    _useState4 = _slicedToArray(_useState3, 2),
    serverLayout = _useState4[0],
    setServerLayout = _useState4[1];
  var _useState5 = (0, _react.useState)(false),
    _useState6 = _slicedToArray(_useState5, 2),
    saving = _useState6[0],
    setSaving = _useState6[1];
  (0, _react.useEffect)(function () {
    if (isOpen && advancedOpen) {
      _api.api.getLayoutConfig().then(function (res) {
        if (res && res.layout) {
          setServerLayout(_objectSpread(_objectSpread({}, DEFAULT_LAYOUT), res.layout));
        }
      })["catch"](function () {});
    }
  }, [isOpen, advancedOpen]);
  if (!isOpen) return null;
  var handleSaveServerLayout = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var res;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            setSaving(true);
            _context.prev = 1;
            _context.next = 4;
            return _api.api.saveLayoutConfig(serverLayout);
          case 4:
            res = _context.sent;
            if (res && res.layout) {
              setServerLayout(_objectSpread(_objectSpread({}, DEFAULT_LAYOUT), res.layout));
            }
            onToast('Preferências do Editor de Layout salvas no PostgreSQL!');
            setAdvancedOpen(false);
            onClose();
            _context.next = 16;
            break;
          case 11:
            _context.prev = 11;
            _context.t0 = _context["catch"](1);
            onToast('Preferências locais aplicadas! (' + _context.t0.message + ')');
            setAdvancedOpen(false);
            onClose();
          case 16:
            _context.prev = 16;
            setSaving(false);
            return _context.finish(16);
          case 19:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[1, 11, 16, 19]]);
    }));
    return function handleSaveServerLayout() {
      return _ref2.apply(this, arguments);
    };
  }();
  var handleResetServerLayout = /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      var res;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return _api.api.resetLayoutConfig();
          case 3:
            res = _context2.sent;
            if (res && res.layout) {
              setServerLayout(_objectSpread(_objectSpread({}, DEFAULT_LAYOUT), res.layout));
            } else {
              setServerLayout(DEFAULT_LAYOUT);
            }
            onToast('Padrão institucional restaurado com sucesso!');
            _context2.next = 12;
            break;
          case 8:
            _context2.prev = 8;
            _context2.t0 = _context2["catch"](0);
            setServerLayout(DEFAULT_LAYOUT);
            onToast('Padrão institucional restaurado!');
          case 12:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[0, 8]]);
    }));
    return function handleResetServerLayout() {
      return _ref3.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 mb-5 p-4 rounded-xl border space-y-4 ".concat(darkMode ? 'bg-[#0A141D]/90 border-[#00D296]/40 text-slate-200' : 'bg-[#F0FBF7] border-[#00D296]/40 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center gap-4 text-xs"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold text-[#00D296] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Palette, {
    className: "w-4 h-4"
  }), " Layout do PDF:"), /*#__PURE__*/_react["default"].createElement("label", {
    className: "flex items-center gap-1.5 font-semibold"
  }, /*#__PURE__*/_react["default"].createElement("span", null, "Cabe\xE7alho:"), /*#__PURE__*/_react["default"].createElement("select", {
    value: layoutConfig.headerStyle,
    onChange: function onChange(e) {
      return setLayoutConfig(_objectSpread(_objectSpread({}, layoutConfig), {}, {
        headerStyle: e.target.value
      }));
    },
    className: "px-2.5 py-1 rounded-lg border text-xs font-bold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("option", null, "Logotipo + CRMV Centralizado"), /*#__PURE__*/_react["default"].createElement("option", null, "Papel Timbrado Minimalista Vetaro"), /*#__PURE__*/_react["default"].createElement("option", null, "Duas Colunas (Cl\xEDnica + Veterin\xE1ria)"))), /*#__PURE__*/_react["default"].createElement("label", {
    className: "flex items-center gap-1.5 font-semibold"
  }, /*#__PURE__*/_react["default"].createElement("span", null, "Grade P\xE1gina 2:"), /*#__PURE__*/_react["default"].createElement("select", {
    value: layoutConfig.gridColumns,
    onChange: function onChange(e) {
      return setLayoutConfig(_objectSpread(_objectSpread({}, layoutConfig), {}, {
        gridColumns: e.target.value
      }));
    },
    className: "px-2.5 py-1 rounded-lg border text-xs font-bold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("option", null, "2 colunas (6 fotos por p\xE1gina)"), /*#__PURE__*/_react["default"].createElement("option", null, "3 colunas (9 fotos compactas)"), /*#__PURE__*/_react["default"].createElement("option", null, "1 coluna (Imagens ampliadas)")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setAdvancedOpen(!advancedOpen);
    },
    className: "px-3 py-1 rounded-lg text-xs font-bold border transition ".concat(darkMode ? 'border-slate-700 bg-[#12222F] text-slate-200 hover:border-[#00D296]' : 'border-slate-300 bg-white text-[#0A141D] hover:border-[#0D5C56]')
  }, advancedOpen ? 'Ocultar Tipografia A4' : 'Tipografia & Preview A4'), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      onClose();
      onToast('Preferências do Editor de Layout salvas!');
    },
    className: "px-3 py-1 rounded-lg text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
  }, "Aplicar Layout"))), advancedOpen && /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-4 border-t grid grid-cols-1 lg:grid-cols-12 gap-5 ".concat(darkMode ? 'border-slate-800' : 'border-teal-500/20')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "lg:col-span-6 space-y-3 text-xs"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 opacity-80"
  }, "Fonte Oficial"), /*#__PURE__*/_react["default"].createElement("select", {
    value: serverLayout.font_family,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        font_family: e.target.value
      }));
    },
    className: "w-full px-2.5 py-1.5 rounded-lg border font-semibold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("option", {
    value: "Calibri, sans-serif"
  }, "Calibri (Padr\xE3o)"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "Arial, sans-serif"
  }, "Arial"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "'Times New Roman', serif"
  }, "Times New Roman"))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 opacity-80"
  }, "Corpo (pt)"), /*#__PURE__*/_react["default"].createElement("select", {
    value: serverLayout.font_size_body,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        font_size_body: e.target.value
      }));
    },
    className: "w-full px-2.5 py-1.5 rounded-lg border font-semibold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("option", {
    value: "9.5pt"
  }, "9.5pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "10pt"
  }, "10pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "10.5pt"
  }, "10.5pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "11pt"
  }, "11pt (Padr\xE3o)"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "11.5pt"
  }, "11.5pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "12pt"
  }, "12pt"))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 opacity-80"
  }, "T\xEDtulo (pt)"), /*#__PURE__*/_react["default"].createElement("select", {
    value: serverLayout.font_size_titulo,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        font_size_titulo: e.target.value
      }));
    },
    className: "w-full px-2.5 py-1.5 rounded-lg border font-semibold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("option", {
    value: "12pt"
  }, "12pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "13pt"
  }, "13pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "14pt"
  }, "14pt (Padr\xE3o)"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "15pt"
  }, "15pt"), /*#__PURE__*/_react["default"].createElement("option", {
    value: "16pt"
  }, "16pt")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5"
  }, [{
    key: 'margin_top',
    label: 'Margem Sup.'
  }, {
    key: 'margin_bottom',
    label: 'Margem Inf.'
  }, {
    key: 'margin_left',
    label: 'Margem Esq.'
  }, {
    key: 'margin_right',
    label: 'Margem Dir.'
  }].map(function (m) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: m.key
    }, /*#__PURE__*/_react["default"].createElement("label", {
      className: "block font-bold mb-1 opacity-80"
    }, m.label), /*#__PURE__*/_react["default"].createElement("input", {
      type: "text",
      value: serverLayout[m.key],
      onChange: function onChange(e) {
        return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, _defineProperty({}, m.key, e.target.value)));
      },
      className: "w-full px-2.5 py-1.5 rounded-lg border font-semibold ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
    }));
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 opacity-80"
  }, "Cor Prim\xE1ria (T\xEDtulos)"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement("input", {
    type: "color",
    value: serverLayout.cor_primaria,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        cor_primaria: e.target.value.toUpperCase()
      }));
    },
    className: "w-8 h-8 rounded cursor-pointer border-0"
  }), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: serverLayout.cor_primaria,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        cor_primaria: e.target.value
      }));
    },
    className: "w-full px-2.5 py-1.5 rounded-lg border font-mono ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  }))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 opacity-80"
  }, "Cor Secund\xE1ria"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement("input", {
    type: "color",
    value: serverLayout.cor_secundaria,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        cor_secundaria: e.target.value.toUpperCase()
      }));
    },
    className: "w-8 h-8 rounded cursor-pointer border-0"
  }), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: serverLayout.cor_secundaria,
    onChange: function onChange(e) {
      return setServerLayout(_objectSpread(_objectSpread({}, serverLayout), {}, {
        cor_secundaria: e.target.value
      }));
    },
    className: "w-full px-2.5 py-1.5 rounded-lg border font-mono ".concat(darkMode ? 'bg-[#12222F] border-slate-700 text-white' : 'bg-white border-slate-300 text-[#0A141D]')
  })))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between pt-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: handleResetServerLayout,
    className: "text-xs font-bold text-slate-400 hover:text-[#00D296] flex items-center gap-1"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.RotateCcw, {
    className: "w-3.5 h-3.5"
  }), " Restaurar Padr\xE3o"), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    disabled: saving,
    onClick: handleSaveServerLayout,
    className: "px-4 py-1.5 rounded-lg text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Check, {
    className: "w-3.5 h-3.5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, saving ? 'Salvando...' : 'Salvar Tipografia no Servidor')))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "lg:col-span-6"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between mb-1.5 text-[11px]"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-bold flex items-center gap-1 text-[#00D296]"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Eye, {
    className: "w-3.5 h-3.5"
  }), " Preview A4 em Tempo Real (P\xE1g. 1)"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "opacity-70"
  }, serverLayout.font_family.split(',')[0])), /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      fontFamily: serverLayout.font_family
    },
    className: "bg-white text-slate-800 rounded-xl p-4 shadow-md border border-slate-300 text-[10px] space-y-2"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between border-b border-slate-200 pb-2"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    style: {
      color: serverLayout.cor_primaria
    },
    className: "font-black text-sm tracking-tight"
  }, userProfile.clinicName || 'UPA PET'), /*#__PURE__*/_react["default"].createElement("div", {
    className: "text-right text-[8px] text-slate-500"
  }, /*#__PURE__*/_react["default"].createElement("p", null, /*#__PURE__*/_react["default"].createElement("strong", null, "Paciente:"), " Thor \u2022 ", /*#__PURE__*/_react["default"].createElement("strong", null, "Esp\xE9cie:"), " Canina"), /*#__PURE__*/_react["default"].createElement("p", null, /*#__PURE__*/_react["default"].createElement("strong", null, "Respons\xE1vel:"), " ", userProfile.name, " (", userProfile.crmv, ")"))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "text-center py-1"
  }, /*#__PURE__*/_react["default"].createElement("p", {
    style: {
      color: serverLayout.cor_primaria,
      fontSize: serverLayout.font_size_titulo
    },
    className: "font-bold"
  }, "RELAT\xD3RIO DE ULTRASSONOGRAFIA ABDOMINAL"), /*#__PURE__*/_react["default"].createElement("p", {
    style: {
      color: serverLayout.cor_secundaria
    },
    className: "italic text-[8px]"
  }, "Exame ultrassonogr\xE1fico abdominal completo em modo B")), /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      fontSize: serverLayout.font_size_body,
      lineHeight: serverLayout.line_height
    },
    className: "space-y-1 text-justify"
  }, /*#__PURE__*/_react["default"].createElement("p", null, /*#__PURE__*/_react["default"].createElement("strong", null, "F\xCDGADO:"), " Dimens\xF5es normais, par\xEAnquima homog\xEAneo e ecogenicidade preservada."), /*#__PURE__*/_react["default"].createElement("p", null, /*#__PURE__*/_react["default"].createElement("strong", null, "VES\xCDCULA BILIAR:"), " Parede fina (0,12 cm), conte\xFAdo anecog\xEAnico."), /*#__PURE__*/_react["default"].createElement("p", null, /*#__PURE__*/_react["default"].createElement("strong", null, "IMPRESS\xC3O DIAGN\xD3STICA:"), " Exame dentro dos padr\xF5es de normalidade."))))));
}
  };
  modules["./components/modals/ModeloCirurgicoModal"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ModeloCirurgicoModal;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _api = require("../../services/api");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function ModeloCirurgicoModal(_ref) {
  var darkMode = _ref.darkMode,
    mode = _ref.mode,
    modelo = _ref.modelo,
    canEdit = _ref.canEdit,
    onClose = _ref.onClose,
    onSaved = _ref.onSaved,
    onSwitchToEdit = _ref.onSwitchToEdit,
    onToast = _ref.onToast;
  var _useState = (0, _react.useState)({
      id: '',
      nome: '',
      procedimento: '',
      diagnosticoPreCirurgico: '',
      sinonimos: '',
      descricaoProcedimento: '',
      evolucaoConsideracoes: ''
    }),
    _useState2 = _slicedToArray(_useState, 2),
    formData = _useState2[0],
    setFormData = _useState2[1];
  var _useState3 = (0, _react.useState)(false),
    _useState4 = _slicedToArray(_useState3, 2),
    saving = _useState4[0],
    setSaving = _useState4[1];
  var _useState5 = (0, _react.useState)(''),
    _useState6 = _slicedToArray(_useState5, 2),
    errorMsg = _useState6[0],
    setErrorMsg = _useState6[1];
  (0, _react.useEffect)(function () {
    if (modelo) {
      setFormData({
        id: modelo.id || '',
        nome: modelo.nome || '',
        procedimento: modelo.procedimento || modelo.nome || '',
        diagnosticoPreCirurgico: modelo.diagnosticoPreCirurgico || '',
        sinonimos: Array.isArray(modelo.sinonimos) ? modelo.sinonimos.join(', ') : modelo.sinonimos || '',
        descricaoProcedimento: modelo.descricaoProcedimento || '',
        evolucaoConsideracoes: modelo.evolucaoConsideracoes || ''
      });
    } else {
      setFormData({
        id: '',
        nome: '',
        procedimento: '',
        diagnosticoPreCirurgico: '',
        sinonimos: '',
        descricaoProcedimento: '',
        evolucaoConsideracoes: ''
      });
    }
    setErrorMsg('');
  }, [modelo, mode]);
  if (!mode) return null;
  var handleSubmit = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(e) {
      var _res$modelo, sinonimosArr, payload, res;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            e.preventDefault();
            setSaving(true);
            setErrorMsg('');
            _context.prev = 3;
            sinonimosArr = formData.sinonimos.split(',').map(function (s) {
              return s.trim();
            }).filter(Boolean);
            payload = _objectSpread(_objectSpread({}, formData.id ? {
              id: formData.id
            } : {}), {}, {
              nome: formData.nome.trim(),
              procedimento: formData.procedimento.trim(),
              diagnosticoPreCirurgico: formData.diagnosticoPreCirurgico.trim(),
              sinonimos: sinonimosArr,
              descricaoProcedimento: formData.descricaoProcedimento.trim(),
              evolucaoConsideracoes: formData.evolucaoConsideracoes.trim()
            });
            _context.next = 8;
            return _api.api.salvarModeloCirurgico(payload);
          case 8:
            res = _context.sent;
            onToast("Modelo \"".concat(((_res$modelo = res.modelo) === null || _res$modelo === void 0 ? void 0 : _res$modelo.nome) || payload.nome, "\" salvo com sucesso!"));
            if (!onSaved) {
              _context.next = 13;
              break;
            }
            _context.next = 13;
            return onSaved();
          case 13:
            onClose();
            _context.next = 19;
            break;
          case 16:
            _context.prev = 16;
            _context.t0 = _context["catch"](3);
            setErrorMsg(_context.t0.message || 'Erro ao salvar modelo cirúrgico.');
          case 19:
            _context.prev = 19;
            setSaving(false);
            return _context.finish(19);
          case 22:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[3, 16, 19, 22]]);
    }));
    return function handleSubmit(_x2) {
      return _ref2.apply(this, arguments);
    };
  }();
  var handleDelete = /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (formData.id) {
              _context2.next = 2;
              break;
            }
            return _context2.abrupt("return");
          case 2:
            if (window.confirm('Deseja realmente excluir este modelo cirúrgico?')) {
              _context2.next = 4;
              break;
            }
            return _context2.abrupt("return");
          case 4:
            _context2.prev = 4;
            _context2.next = 7;
            return _api.api.excluirModeloCirurgico(formData.id);
          case 7:
            onToast('Modelo cirúrgico excluído com sucesso.');
            if (!onSaved) {
              _context2.next = 11;
              break;
            }
            _context2.next = 11;
            return onSaved();
          case 11:
            onClose();
            _context2.next = 17;
            break;
          case 14:
            _context2.prev = 14;
            _context2.t0 = _context2["catch"](4);
            setErrorMsg(_context2.t0.message || 'Erro ao excluir modelo.');
          case 17:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[4, 14]]);
    }));
    return function handleDelete() {
      return _ref3.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/_react["default"].createElement("div", {
    onClick: onClose,
    className: "fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border p-6 shadow-2xl ".concat(darkMode ? 'bg-[#121E28] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, mode === 'view' && modelo ? /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-start justify-between pb-3 border-b border-slate-700/40"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold"
  }, modelo.nome), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-[#00D296] font-bold mt-0.5 flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Stethoscope, {
    className: "w-3.5 h-3.5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, modelo.procedimento || modelo.nome))), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "text-slate-400 hover:text-white font-bold px-2 py-1"
  }, "\u2715")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "overflow-y-auto py-4 space-y-4 text-xs leading-relaxed pr-1"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1.5"
  }, "Sin\xF4nimos / Palavras-chave:"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, Array.isArray(modelo.sinonimos) && modelo.sinonimos.length > 0 ? modelo.sinonimos.map(function (s, idx) {
    return /*#__PURE__*/_react["default"].createElement("span", {
      key: idx,
      className: "px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30"
    }, s);
  }) : /*#__PURE__*/_react["default"].createElement("span", {
    className: "italic text-slate-400"
  }, "Nenhum sin\xF4nimo cadastrado"))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1"
  }, "Diagn\xF3stico Pr\xE9-Cir\xFArgico:"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "p-3 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, modelo.diagnosticoPreCirurgico || 'Não informado / A critério clínico')), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1"
  }, "Descri\xE7\xE3o do Procedimento Cir\xFArgico (T\xE9cnica Padronizada):"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-3.5 rounded-xl border whitespace-pre-line ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, modelo.descricaoProcedimento || 'Nenhuma técnica cadastrada.')), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1"
  }, "Evolu\xE7\xE3o e Considera\xE7\xF5es:"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "p-3 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, modelo.evolucaoConsideracoes || 'Sem considerações adicionais cadastradas.'))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-3 border-t border-slate-700/40 flex items-center justify-between"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[11px] font-mono text-slate-400"
  }, "ID: ", modelo.id), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, canEdit && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onSwitchToEdit(modelo);
    },
    className: "px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/40"
  }, "Editar este Modelo"), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-500/20 text-slate-300"
  }, "Fechar")))) : /*#__PURE__*/_react["default"].createElement("form", {
    onSubmit: handleSubmit,
    className: "flex flex-col flex-1 overflow-hidden"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3"
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold"
  }, formData.id ? 'Editar Modelo Cirúrgico' : 'Novo Modelo Cirúrgico'), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "text-slate-400 hover:text-white font-bold px-2 py-1"
  }, "\u2715")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "overflow-y-auto pr-1 space-y-3.5 text-xs flex-1"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Nome do Modelo *"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    required: true,
    value: formData.nome,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        nome: e.target.value
      }));
    },
    placeholder: "Ex: Celiotomia explorat\xF3ria de urg\xEAncia",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Procedimento Oficial *"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    required: true,
    value: formData.procedimento,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        procedimento: e.target.value
      }));
    },
    placeholder: "Ex: Celiotomia explorat\xF3ria",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Diagn\xF3stico Pr\xE9-Cir\xFArgico Padr\xE3o"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: formData.diagnosticoPreCirurgico,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        diagnosticoPreCirurgico: e.target.value
      }));
    },
    placeholder: "Ex: Corpo estranho g\xE1strico",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  }))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Sin\xF4nimos / Palavras-chave (separados por v\xEDrgula)"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: formData.sinonimos,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        sinonimos: e.target.value
      }));
    },
    placeholder: "Ex: celiotomia, laparotomia, corpo estranho",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Descri\xE7\xE3o do Procedimento Cir\xFArgico (T\xE9cnica Padronizada) *"), /*#__PURE__*/_react["default"].createElement("textarea", {
    required: true,
    rows: 6,
    value: formData.descricaoProcedimento,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        descricaoProcedimento: e.target.value
      }));
    },
    placeholder: "Descreva a t\xE9cnica cir\xFArgica oficial...",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold leading-relaxed ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block font-bold mb-1 text-slate-400"
  }, "Evolu\xE7\xE3o e Considera\xE7\xF5es P\xF3s-Operat\xF3rias"), /*#__PURE__*/_react["default"].createElement("textarea", {
    rows: 3,
    value: formData.evolucaoConsideracoes,
    onChange: function onChange(e) {
      return setFormData(_objectSpread(_objectSpread({}, formData), {}, {
        evolucaoConsideracoes: e.target.value
      }));
    },
    placeholder: "Considera\xE7\xF5es sobre o p\xF3s-cir\xFArgico...",
    className: "w-full px-3.5 py-2 rounded-xl border font-semibold leading-relaxed ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), errorMsg && /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold"
  }, errorMsg)), /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-3 mt-3 border-t border-slate-700/40 flex items-center justify-between"
  }, formData.id ? /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: handleDelete,
    className: "text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Trash2, {
    className: "w-3.5 h-3.5"
  }), " Excluir Modelo") : /*#__PURE__*/_react["default"].createElement("span", null), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-500/20 text-slate-300"
  }, "Cancelar"), /*#__PURE__*/_react["default"].createElement("button", {
    type: "submit",
    disabled: saving,
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Save, {
    className: "w-3.5 h-3.5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, saving ? 'Salvando...' : 'Salvar Modelo')))))));
}
  };
  modules["./components/modals/ReportPreviewModal"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ReportPreviewModal;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function ReportPreviewModal(_ref) {
  var report = _ref.report,
    darkMode = _ref.darkMode,
    onClose = _ref.onClose,
    onToast = _ref.onToast;
  if (!report) return null;
  return /*#__PURE__*/_react["default"].createElement("div", {
    onClick: onClose,
    className: "fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ".concat(darkMode ? 'bg-[#121E28] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("span", {
    className: "px-2.5 py-1 rounded-full text-xs font-bold bg-[#00D296]/15 text-[#00D296]"
  }, report.status || 'Concluído'), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-lg font-extrabold mt-2"
  }, report.title), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-slate-400"
  }, report.patient, " ", report.tutor ? "\u2022 Tutor: ".concat(report.tutor) : '', " \u2022 ", report.date)), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onClose,
    className: "text-slate-400 hover:text-white font-bold px-2 py-1"
  }, "\u2715")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, report.summary), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap justify-end gap-2"
  }, report.docxUrl && /*#__PURE__*/_react["default"].createElement("a", {
    href: report.docxUrl,
    target: "_blank",
    rel: "noreferrer",
    onClick: function onClick() {
      return onToast && onToast('Arquivo Word (.docx) baixado com sucesso!');
    },
    className: "px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition ".concat(darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-[#0A141D] hover:bg-slate-200')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileCheck, {
    className: "w-4 h-4 text-[#00D296]"
  }), " Baixar Word (.docx)"), report.pdfUrl ? /*#__PURE__*/_react["default"].createElement("a", {
    href: report.pdfUrl,
    target: "_blank",
    rel: "noreferrer",
    onClick: function onClick() {
      if (onToast) onToast('PDF baixado com sucesso!');
      onClose();
    },
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Download, {
    className: "w-4 h-4"
  }), " Baixar PDF") : /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      if (onToast) onToast('PDF baixado com sucesso!');
      onClose();
    },
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Download, {
    className: "w-4 h-4"
  }), " Baixar PDF"))));
}
  };
  modules["./context/AuthContext"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthProvider = AuthProvider;
exports.computeGreetingName = computeGreetingName;
exports.computeInitials = computeInitials;
exports.useAuth = useAuth;
var _react = _interopRequireWildcard(require("react"));
var _api = require("../services/api");
var _ThemeContext = require("./ThemeContext");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
var AuthContext = /*#__PURE__*/(0, _react.createContext)(null);
function computeInitials() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var clean = String(name || '').replace(/^(Dra?\.?\s+)/i, '').trim();
  if (!clean) return 'VT';
  var parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function computeGreetingName() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var trimmed = String(name || '').trim();
  if (!trimmed) return 'Doutor(a)';
  var parts = trimmed.split(/\s+/);
  if (/^Dra?\.?$/i.test(parts[0]) && parts.length >= 2) {
    return "".concat(parts[0], " ").concat(parts[1]);
  }
  return parts[0];
}
function AuthProvider(_ref) {
  var children = _ref.children;
  var _useTheme = (0, _ThemeContext.useTheme)(),
    syncThemeFromUser = _useTheme.syncThemeFromUser;
  var _useState = (0, _react.useState)(null),
    _useState2 = _slicedToArray(_useState, 2),
    usuario = _useState2[0],
    setUsuarioState = _useState2[1];
  var _useState3 = (0, _react.useState)({
      googleClientId: '',
      ssoAtivo: false
    }),
    _useState4 = _slicedToArray(_useState3, 2),
    ssoConfig = _useState4[0],
    setSsoConfig = _useState4[1];
  var _useState5 = (0, _react.useState)(true),
    _useState6 = _slicedToArray(_useState5, 2),
    carregandoSessao = _useState6[0],
    setCarregandoSessao = _useState6[1];
  var enrichUser = (0, _react.useCallback)(function (u) {
    if (!u) return null;
    var nome = u.nome || u.name || 'Veterinário(a)';
    return _objectSpread(_objectSpread({}, u), {}, {
      nome: nome,
      name: nome,
      greetingName: computeGreetingName(nome),
      initials: computeInitials(nome),
      crmv: u.crmv || 'CRMV não informado',
      nomeClinica: u.nomeClinica || u.clinicName || 'UPA PET',
      clinicName: u.nomeClinica || u.clinicName || 'UPA PET',
      specialty: u.specialty || 'Diagnóstico por Imagem & Cirurgia Veterinária',
      autoMeasurements: u.autoMeasurements !== undefined ? u.autoMeasurements : true,
      voiceDictation: u.voiceDictation !== undefined ? u.voiceDictation : true,
      includeHeaderLogo: u.includeHeaderLogo !== undefined ? u.includeHeaderLogo : true
    });
  }, []);
  var refreshAuth = (0, _react.useCallback)( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var _meRes$value, _yield$Promise$allSet, _yield$Promise$allSet2, cfgRes, meRes, userObj;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          setCarregandoSessao(true);
          _context.prev = 1;
          _context.next = 4;
          return Promise.allSettled([_api.api.getAuthConfig(), _api.api.getMe()]);
        case 4:
          _yield$Promise$allSet = _context.sent;
          _yield$Promise$allSet2 = _slicedToArray(_yield$Promise$allSet, 2);
          cfgRes = _yield$Promise$allSet2[0];
          meRes = _yield$Promise$allSet2[1];
          if (cfgRes.status === 'fulfilled' && cfgRes.value) {
            setSsoConfig(cfgRes.value);
          }
          if (meRes.status === 'fulfilled' && (_meRes$value = meRes.value) !== null && _meRes$value !== void 0 && _meRes$value.usuario) {
            userObj = enrichUser(meRes.value.usuario);
            setUsuarioState(userObj);
            if (meRes.value.usuario.temaPreferencia) {
              syncThemeFromUser(meRes.value.usuario.temaPreferencia);
            } else {
              _api.api.getTema().then(function (t) {
                if (t && t.tema) syncThemeFromUser(t.tema);
              })["catch"](function () {});
            }
          } else {
            setUsuarioState(null);
          }
          _context.next = 15;
          break;
        case 12:
          _context.prev = 12;
          _context.t0 = _context["catch"](1);
          setUsuarioState(null);
        case 15:
          _context.prev = 15;
          setCarregandoSessao(false);
          return _context.finish(15);
        case 18:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 12, 15, 18]]);
  })), [enrichUser, syncThemeFromUser]);
  (0, _react.useEffect)(function () {
    refreshAuth();
  }, [refreshAuth]);
  var loginComGoogleCredential = (0, _react.useCallback)( /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(credential) {
      var data, enriched;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return _api.api.loginWithGoogle(credential);
          case 2:
            data = _context2.sent;
            if (!(data !== null && data !== void 0 && data.usuario)) {
              _context2.next = 8;
              break;
            }
            enriched = enrichUser(data.usuario);
            setUsuarioState(enriched);
            if (data.usuario.temaPreferencia) {
              syncThemeFromUser(data.usuario.temaPreferencia);
            }
            return _context2.abrupt("return", enriched);
          case 8:
            throw new Error('Falha ao autenticar usuário.');
          case 9:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    return function (_x2) {
      return _ref3.apply(this, arguments);
    };
  }(), [enrichUser, syncThemeFromUser]);
  var atualizarUsuarioLocal = (0, _react.useCallback)(function (novosDados) {
    setUsuarioState(function (prev) {
      if (!prev) return null;
      return enrichUser(_objectSpread(_objectSpread({}, prev), novosDados));
    });
  }, [enrichUser]);
  var logout = (0, _react.useCallback)( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return _api.api.logout();
        case 3:
          _context3.next = 7;
          break;
        case 5:
          _context3.prev = 5;
          _context3.t0 = _context3["catch"](0);
        case 7:
          setUsuarioState(null);
        case 8:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 5]]);
  })), []);
  return /*#__PURE__*/_react["default"].createElement(AuthContext.Provider, {
    value: {
      usuario: usuario,
      ssoConfig: ssoConfig,
      carregandoSessao: carregandoSessao,
      loginComGoogleCredential: loginComGoogleCredential,
      atualizarUsuarioLocal: atualizarUsuarioLocal,
      refreshAuth: refreshAuth,
      logout: logout
    }
  }, children);
}
function useAuth() {
  var ctx = (0, _react.useContext)(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
  };
  modules["./context/ThemeContext"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
var _react = _interopRequireWildcard(require("react"));
var _api = require("../services/api");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
var ThemeContext = /*#__PURE__*/(0, _react.createContext)(null);
function resolveIsDark(pref) {
  if (pref === 'light') return false;
  if (pref === 'dark') return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}
function ThemeProvider(_ref) {
  var children = _ref.children;
  var _useState = (0, _react.useState)(function () {
      try {
        return localStorage.getItem('tema_preferencia') || 'dark';
      } catch (_) {
        return 'dark';
      }
    }),
    _useState2 = _slicedToArray(_useState, 2),
    temaPreferencia = _useState2[0],
    setTemaPreferencia = _useState2[1];
  var _useState3 = (0, _react.useState)(function () {
      return resolveIsDark(temaPreferencia);
    }),
    _useState4 = _slicedToArray(_useState3, 2),
    darkMode = _useState4[0],
    setDarkModeState = _useState4[1];
  var applyThemeToDOM = (0, _react.useCallback)(function (isDark, prefString) {
    setDarkModeState(isDark);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
    try {
      localStorage.setItem('tema_preferencia', prefString);
    } catch (_) {}
  }, []);
  (0, _react.useEffect)(function () {
    applyThemeToDOM(resolveIsDark(temaPreferencia), temaPreferencia);
  }, [temaPreferencia, applyThemeToDOM]);
  (0, _react.useEffect)(function () {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function handler() {
      try {
        var saved = localStorage.getItem('tema_preferencia');
        if (saved === 'system') {
          applyThemeToDOM(mq.matches, 'system');
        }
      } catch (_) {}
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return function () {
        return mq.removeEventListener('change', handler);
      };
    }
  }, [applyThemeToDOM]);
  var setDarkMode = (0, _react.useCallback)(function (nextDark) {
    var syncBackend = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var resolvedBool = typeof nextDark === 'function' ? nextDark(darkMode) : Boolean(nextDark);
    var nextPref = resolvedBool ? 'dark' : 'light';
    setTemaPreferencia(nextPref);
    applyThemeToDOM(resolvedBool, nextPref);
    if (syncBackend) {
      _api.api.saveTema(nextPref)["catch"](function () {});
    }
  }, [darkMode, applyThemeToDOM]);
  var setTema = (0, _react.useCallback)(function (pref) {
    var syncBackend = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var validPref = ['dark', 'light', 'system'].includes(pref) ? pref : 'dark';
    var isDark = resolveIsDark(validPref);
    setTemaPreferencia(validPref);
    applyThemeToDOM(isDark, validPref);
    if (syncBackend) {
      _api.api.saveTema(validPref)["catch"](function () {});
    }
  }, [applyThemeToDOM]);
  var toggleDarkMode = (0, _react.useCallback)(function () {
    setDarkMode(!darkMode, true);
  }, [darkMode, setDarkMode]);
  var syncThemeFromUser = (0, _react.useCallback)(function (userTema) {
    if (!userTema) return;
    var validPref = ['dark', 'light', 'system'].includes(userTema) ? userTema : 'dark';
    setTemaPreferencia(validPref);
    applyThemeToDOM(resolveIsDark(validPref), validPref);
  }, [applyThemeToDOM]);
  return /*#__PURE__*/_react["default"].createElement(ThemeContext.Provider, {
    value: {
      darkMode: darkMode,
      temaPreferencia: temaPreferencia,
      setDarkMode: setDarkMode,
      setTema: setTema,
      toggleDarkMode: toggleDarkMode,
      syncThemeFromUser: syncThemeFromUser
    }
  }, children);
}
function useTheme() {
  var ctx = (0, _react.useContext)(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
  };
  modules["./main"] = function(require, module, exports) {
"use strict";

var _react = _interopRequireDefault(require("react"));
var _client = _interopRequireDefault(require("react-dom/client"));
var _App = _interopRequireDefault(require("./App"));
var _ThemeContext = require("./context/ThemeContext");
var _AuthContext = require("./context/AuthContext");
require("./index.css");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
_client["default"].createRoot(document.getElementById('root')).render( /*#__PURE__*/_react["default"].createElement(_react["default"].StrictMode, null, /*#__PURE__*/_react["default"].createElement(_ThemeContext.ThemeProvider, null, /*#__PURE__*/_react["default"].createElement(_AuthContext.AuthProvider, null, /*#__PURE__*/_react["default"].createElement(_App["default"], null)))));
  };
  modules["./pages/DashboardHome"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = DashboardHome;
var _react = _interopRequireDefault(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../components/icons/VetaroIcons");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function DashboardHome(_ref) {
  var darkMode = _ref.darkMode,
    _ref$isTabletLayout = _ref.isTabletLayout,
    isTabletLayout = _ref$isTabletLayout === void 0 ? false : _ref$isTabletLayout,
    _ref$isMobileLayout = _ref.isMobileLayout,
    isMobileLayout = _ref$isMobileLayout === void 0 ? false : _ref$isMobileLayout,
    _ref$activities = _ref.activities,
    activities = _ref$activities === void 0 ? [] : _ref$activities,
    _ref$loadingHistory = _ref.loadingHistory,
    loadingHistory = _ref$loadingHistory === void 0 ? false : _ref$loadingHistory,
    onRefreshHistory = _ref.onRefreshHistory,
    onNavigate = _ref.onNavigate,
    onSelectReport = _ref.onSelectReport;
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-7"
  }, isTabletLayout ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ".concat(darkMode ? 'bg-gradient-to-r from-[#132530] to-[#0E3130] border-teal-500/20' : 'bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.UltrasoundIcon, {
    className: "w-10 h-10"
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-xl font-extrabold"
  }, "Ultrassom"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm max-w-md my-1.5 ".concat(darkMode ? 'text-slate-300' : 'text-slate-600')
  }, "Envie suas imagens e receba um laudo completo com IA."), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onNavigate('ultrassom');
    },
    className: "mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ".concat(darkMode ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]' : 'bg-[#0D5C56] text-white hover:bg-[#094742]')
  }, "Come\xE7ar agora ", /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowRight, {
    className: "w-4 h-4"
  })))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ".concat(darkMode ? 'bg-gradient-to-r from-[#13232F] to-[#0F2C30] border-teal-500/20' : 'bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileText, {
    className: "w-9 h-9"
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-xl font-extrabold"
  }, "Relat\xF3rio"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm max-w-md my-1.5 ".concat(darkMode ? 'text-slate-300' : 'text-slate-600')
  }, "Envie seu documento e gere um relat\xF3rio personalizado."), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onNavigate('relatorio');
    },
    className: "mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ".concat(darkMode ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]' : 'bg-[#0D5C56] text-white hover:bg-[#094742]')
  }, "Come\xE7ar agora ", /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowRight, {
    className: "w-4 h-4"
  }))))) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid ".concat(isMobileLayout ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl ".concat(isMobileLayout ? 'p-5' : 'p-7', " border overflow-hidden transition ").concat(darkMode ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20' : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.UltrasoundIcon, {
    className: "w-7 h-7"
  })), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-xl font-extrabold"
  }, "Ultrassom"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ".concat(darkMode ? 'text-slate-300' : 'text-[#3F5368]')
  }, "Envie suas imagens e receba um laudo completo com IA."), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onNavigate('ultrassom');
    },
    className: "px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ".concat(darkMode ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]' : 'bg-[#0D5C56] text-white hover:bg-[#094742]')
  }, "Come\xE7ar agora ", /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowRight, {
    className: "w-4 h-4"
  })))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl ".concat(isMobileLayout ? 'p-5' : 'p-7', " border overflow-hidden transition ").concat(darkMode ? 'bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20' : 'bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileText, {
    className: "w-7 h-7"
  })), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-xl font-extrabold"
  }, "Relat\xF3rio"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ".concat(darkMode ? 'text-slate-300' : 'text-[#3F5368]')
  }, "Envie seu documento e gere um relat\xF3rio personalizado."), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onNavigate('relatorio');
    },
    className: "px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ".concat(darkMode ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]' : 'bg-[#0D5C56] text-white hover:bg-[#094742]')
  }, "Come\xE7ar agora ", /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowRight, {
    className: "w-4 h-4"
  }))))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold"
  }, "Atividade recente"), onRefreshHistory && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onRefreshHistory,
    title: "Sincronizar hist\xF3rico com PostgreSQL",
    className: "p-1.5 rounded-lg border text-xs transition ".concat(darkMode ? 'border-slate-800 bg-[#0E1A24] text-slate-400 hover:text-[#00D296]' : 'border-slate-200 bg-white text-slate-500 hover:text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.RefreshCw, {
    className: "w-3.5 h-3.5 ".concat(loadingHistory ? 'animate-spin' : '')
  }))), activities.length > 0 && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return onSelectReport(activities[0]);
    },
    className: "text-xs font-bold inline-flex items-center gap-1 hover:underline ".concat(darkMode ? 'text-[#00D296]' : 'text-[#0D5C56]')
  }, "Ver todos ", /*#__PURE__*/_react["default"].createElement(_lucideReact.ArrowRight, {
    className: "w-3.5 h-3.5"
  }))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "rounded-2xl border divide-y overflow-hidden ".concat(darkMode ? 'bg-[#0E1A24] border-slate-800/90 divide-slate-800/80' : 'bg-white border-slate-200 divide-slate-100')
  }, activities.length === 0 ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-8 text-center text-xs text-slate-400"
  }, loadingHistory ? 'Carregando histórico do PostgreSQL...' : 'Nenhum laudo de ultrassom ou relatório cirúrgico emitido ainda.') : activities.map(function (item) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: item.id,
      onClick: function onClick() {
        return onSelectReport(item);
      },
      className: "px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 cursor-pointer transition ".concat(darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
    }, /*#__PURE__*/_react["default"].createElement("div", {
      className: "flex items-center gap-3 min-w-0"
    }, /*#__PURE__*/_react["default"].createElement("div", {
      className: "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ".concat(darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-[#0A141D]')
    }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileText, {
      className: "w-4 h-4"
    })), /*#__PURE__*/_react["default"].createElement("div", {
      className: "truncate"
    }, /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-xs sm:text-sm font-bold truncate"
    }, item.title, item.patient ? /*#__PURE__*/_react["default"].createElement("span", {
      className: "font-normal opacity-80"
    }, " \u2014 ", item.patient) : null), isMobileLayout && /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-[10px] text-slate-400 truncate"
    }, item.date))), !isMobileLayout && /*#__PURE__*/_react["default"].createElement("span", {
      className: "text-xs font-medium shrink-0 ".concat(darkMode ? 'text-slate-400' : 'text-[#637692]')
    }, item.date), /*#__PURE__*/_react["default"].createElement("div", {
      className: "flex items-center gap-3 shrink-0"
    }, /*#__PURE__*/_react["default"].createElement("span", {
      className: "px-3 py-1 rounded-full text-xs font-bold ".concat(darkMode ? 'bg-[#0D4A3E] text-[#2CE5B1]' : 'bg-[#D3F7E9] text-[#0D684E]')
    }, item.status), /*#__PURE__*/_react["default"].createElement(_lucideReact.MoreHorizontal, {
      className: "w-4 h-4 text-slate-400"
    })));
  }))));
}
  };
  modules["./pages/LoginPage"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = LoginPage;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../components/icons/VetaroIcons");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function LoginPage(_ref) {
  var darkMode = _ref.darkMode,
    setDarkMode = _ref.setDarkMode,
    ssoConfig = _ref.ssoConfig,
    onGoogleCredential = _ref.onGoogleCredential,
    onToast = _ref.onToast;
  var googleBtnRef = (0, _react.useRef)(null);
  (0, _react.useEffect)(function () {
    if (!(ssoConfig !== null && ssoConfig !== void 0 && ssoConfig.googleClientId)) return;
    var timer = null;
    var renderBtn = function renderBtn() {
      if (window.google && window.google.accounts && window.google.accounts.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: ssoConfig.googleClientId,
          callback: function () {
            var _callback = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(response) {
              return _regeneratorRuntime().wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                  case 0:
                    _context.prev = 0;
                    _context.next = 3;
                    return onGoogleCredential(response.credential);
                  case 3:
                    onToast('Autenticado com sucesso!');
                    _context.next = 9;
                    break;
                  case 6:
                    _context.prev = 6;
                    _context.t0 = _context["catch"](0);
                    onToast('Erro no login Google: ' + _context.t0.message);
                  case 9:
                  case "end":
                    return _context.stop();
                }
              }, _callee, null, [[0, 6]]);
            }));
            function callback(_x) {
              return _callback.apply(this, arguments);
            }
            return callback;
          }()
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: darkMode ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280
        });
      } else {
        timer = setTimeout(renderBtn, 400);
      }
    };
    renderBtn();
    return function () {
      if (timer) clearTimeout(timer);
    };
  }, [ssoConfig, darkMode, onGoogleCredential, onToast]);
  return /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      fontFamily: "'Manrope', sans-serif"
    },
    className: "min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 ".concat(darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "max-w-5xl w-full mx-auto flex items-center justify-between"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
    size: 34,
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setDarkMode(!darkMode);
    },
    className: "px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition ".concat(darkMode ? 'border-slate-800 bg-[#0F1C26] text-[#00D296]' : 'border-slate-200 bg-white text-[#0D5C56]')
  }, darkMode ? /*#__PURE__*/_react["default"].createElement(_lucideReact.Sun, {
    className: "w-4 h-4"
  }) : /*#__PURE__*/_react["default"].createElement(_lucideReact.Moon, {
    className: "w-4 h-4"
  }), /*#__PURE__*/_react["default"].createElement("span", null, darkMode ? 'Modo Claro' : 'Modo Escuro'))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "my-auto max-w-md w-full mx-auto"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-3xl border p-8 sm:p-10 shadow-2xl overflow-hidden text-center ".concat(darkMode ? 'bg-[#0F1C26] border-[#1E3545] text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 flex flex-col items-center"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.ShieldCheck, {
    className: "w-8 h-8"
  })), /*#__PURE__*/_react["default"].createElement("h1", {
    className: "text-2xl font-extrabold tracking-tight"
  }, "Acesso Restrito ao Sistema"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs sm:text-sm mt-2 mb-6 leading-relaxed ".concat(darkMode ? 'text-slate-300' : 'text-[#52657A]')
  }, "Entre com sua conta Google autorizada para emitir laudos de ultrassom e relat\xF3rios cir\xFArgicos oficiais."), ssoConfig !== null && ssoConfig !== void 0 && ssoConfig.googleClientId ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-center my-2",
    ref: googleBtnRef
  }) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-full p-3.5 rounded-xl border text-xs text-left ".concat(darkMode ? 'bg-[#0A141D]/80 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900')
  }, /*#__PURE__*/_react["default"].createElement("strong", null, "Configura\xE7\xE3o pendente:"), " Defina a vari\xE1vel", ' ', /*#__PURE__*/_react["default"].createElement("code", null, "GOOGLE_CLIENT_ID"), " no arquivo ", /*#__PURE__*/_react["default"].createElement("code", null, ".env"), " do servidor.")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "text-center text-xs text-slate-500"
  }, "vetaro \u2022 Tecnologia que cuida"));
}
  };
  modules["./pages/SettingsPage"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = SettingsPage;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _api = require("../services/api");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function SettingsPage(_ref) {
  var darkMode = _ref.darkMode,
    setDarkMode = _ref.setDarkMode,
    _ref$isMobileLayout = _ref.isMobileLayout,
    isMobileLayout = _ref$isMobileLayout === void 0 ? false : _ref$isMobileLayout,
    settingsTab = _ref.settingsTab,
    setSettingsTab = _ref.setSettingsTab,
    userProfile = _ref.userProfile,
    setUserProfile = _ref.setUserProfile,
    _ref$activitiesCount = _ref.activitiesCount,
    activitiesCount = _ref$activitiesCount === void 0 ? 142 : _ref$activitiesCount,
    onOpenAdminModal = _ref.onOpenAdminModal,
    onToast = _ref.onToast;
  var logoInputRef = (0, _react.useRef)(null);
  var assinaturaInputRef = (0, _react.useRef)(null);
  var _useState = (0, _react.useState)(null),
    _useState2 = _slicedToArray(_useState, 2),
    logoFile = _useState2[0],
    setLogoFile = _useState2[1];
  var _useState3 = (0, _react.useState)(null),
    _useState4 = _slicedToArray(_useState3, 2),
    assinaturaFile = _useState4[0],
    setAssinaturaFile = _useState4[1];
  var _useState5 = (0, _react.useState)(false),
    _useState6 = _slicedToArray(_useState5, 2),
    savingProfile = _useState6[0],
    setSavingProfile = _useState6[1];
  var handleSaveProfile = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var fd, res;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            setSavingProfile(true);
            _context.prev = 1;
            fd = new FormData();
            fd.append('nome', userProfile.name || '');
            fd.append('crmv', userProfile.crmv || '');
            fd.append('nomeClinica', userProfile.clinicName || '');
            if (logoFile) fd.append('logo', logoFile);
            if (assinaturaFile) fd.append('assinatura', assinaturaFile);
            _context.next = 10;
            return _api.api.updatePerfilProfissional(fd);
          case 10:
            res = _context.sent;
            if (res && res.usuario) {
              setUserProfile(_objectSpread(_objectSpread(_objectSpread({}, userProfile), res.usuario), {}, {
                name: res.usuario.nome || userProfile.name,
                clinicName: res.usuario.nomeClinica || userProfile.clinicName
              }));
            }
            onToast("Dados do perfil (".concat(userProfile.name, ") salvos com sucesso!"));
            _context.next = 18;
            break;
          case 15:
            _context.prev = 15;
            _context.t0 = _context["catch"](1);
            onToast("Dados do perfil da ".concat(userProfile.name, " atualizados!"));
          case 18:
            _context.prev = 18;
            setSavingProfile(false);
            return _context.finish(18);
          case 21:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[1, 15, 18, 21]]);
    }));
    return function handleSaveProfile() {
      return _ref2.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/40"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, [{
    id: 'perfil',
    label: "Meu perfil (".concat(userProfile.greetingName, ")"),
    icon: _lucideReact.User
  }, {
    id: 'assinatura',
    label: 'Plano e assinatura',
    icon: _lucideReact.CreditCard
  }, {
    id: 'preferencias',
    label: 'Configurações & IA',
    icon: _lucideReact.Settings
  }].map(function (tab) {
    var Icon = tab.icon;
    var active = settingsTab === tab.id;
    return /*#__PURE__*/_react["default"].createElement("button", {
      key: tab.id,
      type: "button",
      onClick: function onClick() {
        return setSettingsTab(tab.id);
      },
      className: "px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ".concat(active ? 'bg-[#00D296] text-[#062E2B] shadow-sm' : darkMode ? 'bg-[#0F1C26] text-slate-300 hover:bg-slate-800' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100')
    }, /*#__PURE__*/_react["default"].createElement(Icon, {
      className: "w-4 h-4"
    }), /*#__PURE__*/_react["default"].createElement("span", null, tab.label));
  })), userProfile.role === 'admin' && onOpenAdminModal && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onOpenAdminModal,
    className: "px-3.5 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.ShieldCheck, {
    className: "w-4 h-4"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Controle de Acessos (Admin)"))), settingsTab === 'perfil' && /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid ".concat(isMobileLayout ? 'grid-cols-1' : 'grid-cols-12', " gap-6")
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "".concat(isMobileLayout ? '' : 'col-span-4', " p-6 rounded-2xl border flex flex-col items-center text-center ").concat(darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-20 h-20 rounded-full bg-[#637692] text-white flex items-center justify-center font-extrabold text-2xl mb-3 shadow-lg"
  }, userProfile.initials), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-lg font-extrabold"
  }, userProfile.name), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-[#00D296] font-bold mt-0.5"
  }, userProfile.crmv), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, userProfile.email), /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-full mt-5 p-3.5 rounded-xl border text-left text-xs space-y-1.5 ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600')
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "font-extrabold text-[11px] uppercase tracking-wider text-[#00D296]"
  }, "Carimbo Digital nos Laudos"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "font-bold"
  }, userProfile.name), /*#__PURE__*/_react["default"].createElement("p", null, userProfile.crmv, " \u2022 Diagn\xF3stico Veterin\xE1rio"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "Assinatura eletr\xF4nica ativa em todos os PDFs gerados."))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "".concat(isMobileLayout ? '' : 'col-span-8', " p-6 rounded-2xl border space-y-4 ").concat(darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Stethoscope, {
    className: "w-4 h-4 text-[#00D296]"
  }), "Dados Profissionais & Cl\xEDnica Veterin\xE1ria"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid ".concat(isMobileLayout ? 'grid-cols-1' : 'grid-cols-2', " gap-4")
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block text-xs font-bold mb-1 text-slate-400"
  }, "Nome Completo no Laudo"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: userProfile.name,
    onChange: function onChange(e) {
      return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, {
        name: e.target.value,
        nome: e.target.value
      }));
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block text-xs font-bold mb-1 text-slate-400"
  }, "Registro CRMV / UF"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: userProfile.crmv,
    onChange: function onChange(e) {
      return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, {
        crmv: e.target.value
      }));
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block text-xs font-bold mb-1 text-slate-400"
  }, "E-mail Profissional"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "email",
    value: userProfile.email,
    onChange: function onChange(e) {
      return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, {
        email: e.target.value
      }));
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block text-xs font-bold mb-1 text-slate-400"
  }, "Nome da Cl\xEDnica / Servi\xE7o Volante"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: userProfile.clinicName,
    onChange: function onChange(e) {
      return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, {
        clinicName: e.target.value,
        nomeClinica: e.target.value
      }));
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  }))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("label", {
    className: "block text-xs font-bold mb-1 text-slate-400"
  }, "Especialidade exibida no rodap\xE9 dos laudos"), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: userProfile.specialty,
    onChange: function onChange(e) {
      return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, {
        specialty: e.target.value
      }));
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid ".concat(isMobileLayout ? 'grid-cols-1' : 'grid-cols-2', " gap-4 pt-1")
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("input", {
    ref: logoInputRef,
    type: "file",
    accept: "image/png,image/jpeg",
    className: "hidden",
    onChange: function onChange(e) {
      var _e$target$files;
      return setLogoFile(((_e$target$files = e.target.files) === null || _e$target$files === void 0 ? void 0 : _e$target$files[0]) || null);
    }
  }), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return logoInputRef.current && logoInputRef.current.click();
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Upload, {
    className: "w-4 h-4 text-[#00D296]"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "truncate"
  }, logoFile ? logoFile.name : 'Enviar Logotipo da Clínica (PNG/JPG)'))), /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("input", {
    ref: assinaturaInputRef,
    type: "file",
    accept: "image/png,image/jpeg",
    className: "hidden",
    onChange: function onChange(e) {
      var _e$target$files2;
      return setAssinaturaFile(((_e$target$files2 = e.target.files) === null || _e$target$files2 === void 0 ? void 0 : _e$target$files2[0]) || null);
    }
  }), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return assinaturaInputRef.current && assinaturaInputRef.current.click();
    },
    className: "w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ".concat(darkMode ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Upload, {
    className: "w-4 h-4 text-[#00D296]"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "truncate"
  }, assinaturaFile ? assinaturaFile.name : 'Enviar Assinatura / Carimbo (PNG/JPG)')))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    disabled: savingProfile,
    onClick: handleSaveProfile,
    className: "px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition"
  }, savingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil')))), settingsTab === 'assinatura' && /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid ".concat(isMobileLayout ? 'grid-cols-1' : 'grid-cols-12', " gap-6")
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "".concat(isMobileLayout ? '' : 'col-span-7', " p-6 rounded-2xl border space-y-4 ").concat(darkMode ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/30' : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "px-3 py-1 rounded-full text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
  }, "PLANO ATIVO \u2022 RENOVA\xC7\xC3O AUTOM\xC1TICA"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-xs font-bold opacity-80"
  }, "R$ 189,00 / m\xEAs")), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-2xl font-extrabold"
  }, "Vetaro Pro IA \u2014 Ilimitado"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs leading-relaxed opacity-90"
  }, "Laudos de ultrassom e relat\xF3rios cl\xEDnicos ilimitados com transcri\xE7\xE3o por voz, an\xE1lise de imagens DICOM/JPEG e papel timbrado personalizado."), /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-3 gap-3 pt-2"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-3 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D]/60 border-teal-500/20' : 'bg-white/80 border-teal-600/20')
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "Laudos este m\xEAs"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-lg font-extrabold text-[#00D296]"
  }, Math.max(142, activitiesCount))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-3 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D]/60 border-teal-500/20' : 'bg-white/80 border-teal-600/20')
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "Tempo economizado"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-lg font-extrabold text-[#00D296]"
  }, "~35h")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-3 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D]/60 border-teal-500/20' : 'bg-white/80 border-teal-600/20')
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "Pr\xF3xima fatura"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm font-extrabold"
  }, "15/12/2025")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "".concat(isMobileLayout ? '' : 'col-span-5', " p-6 rounded-2xl border space-y-3 ").concat(darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("h4", {
    className: "text-sm font-extrabold"
  }, "M\xE9todo de Pagamento & Faturas"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-3.5 rounded-xl border flex items-center justify-between text-xs ".concat(darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-bold"
  }, "Mastercard \u2022\u2022\u2022\u2022 4821"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-[#00D296] font-bold"
  }, "Padr\xE3o")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-2 text-xs pt-2"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-between py-1.5 border-b border-slate-700/30"
  }, /*#__PURE__*/_react["default"].createElement("span", null, "15/11/2025 \u2014 Vetaro Pro IA"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-bold text-[#00D296]"
  }, "Pago (R$ 189)")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-between py-1.5 border-b border-slate-700/30"
  }, /*#__PURE__*/_react["default"].createElement("span", null, "15/10/2025 \u2014 Vetaro Pro IA"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "font-bold text-[#00D296]"
  }, "Pago (R$ 189)"))))), settingsTab === 'preferencias' && /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-6 rounded-2xl border space-y-5 ".concat(darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold"
  }, "Prefer\xEAncias de Gera\xE7\xE3o de Laudos com IA & Apar\xEAncia"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-3"
  }, [{
    key: 'autoMeasurements',
    title: 'Sugestão Automática de Impressão Diagnóstica',
    desc: 'A IA Vetaro sugere hipóteses diagnósticas ao final do laudo de ultrassom.'
  }, {
    key: 'voiceDictation',
    title: 'Transcrição de Voz Veterinária em Tempo Real',
    desc: 'Permite ditar medidas de órgãos durante o exame ultrassonográfico.'
  }, {
    key: 'includeHeaderLogo',
    title: 'Incluir Papel Timbrado e Carimbo CRMV no PDF',
    desc: 'Exporta os laudos prontos para envio via WhatsApp ou impressão.'
  }].map(function (item) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: item.key,
      onClick: function onClick() {
        return setUserProfile(_objectSpread(_objectSpread({}, userProfile), {}, _defineProperty({}, item.key, !userProfile[item.key])));
      },
      className: "p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ".concat(darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200')
    }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-xs sm:text-sm font-extrabold"
    }, item.title), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-xs text-slate-400 mt-0.5"
    }, item.desc)), /*#__PURE__*/_react["default"].createElement("div", {
      className: "w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ".concat(userProfile[item.key] ? 'bg-[#00D296]' : 'bg-slate-600')
    }, /*#__PURE__*/_react["default"].createElement("span", {
      className: "w-5 h-5 rounded-full bg-white shadow transform transition-transform",
      style: {
        transform: userProfile[item.key] ? 'translateX(22px)' : 'translateX(2px)'
      }
    })));
  }), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return setDarkMode(!darkMode);
    },
    className: "p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ".concat(darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs sm:text-sm font-extrabold"
  }, "Modo Claro (Tema da Interface)"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Alterna instantaneamente entre o tema Escuro (#0A141D) e Claro (#F8FAFC).")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ".concat(!darkMode ? 'bg-[#00D296]' : 'bg-[#00A878]')
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "w-5 h-5 rounded-full bg-white shadow transform transition-transform",
    style: {
      transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
    }
  }))))));
}
  };
  modules["./pages/SurgeryGenerator"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = SurgeryGenerator;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../components/icons/VetaroIcons");
var _ModeloCirurgicoModal = _interopRequireDefault(require("../components/modals/ModeloCirurgicoModal"));
var _api = require("../services/api");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function SurgeryGenerator(_ref) {
  var darkMode = _ref.darkMode,
    userProfile = _ref.userProfile,
    layoutConfig = _ref.layoutConfig,
    onOpenProfile = _ref.onOpenProfile,
    onNavigateHome = _ref.onNavigateHome,
    onAddActivity = _ref.onAddActivity,
    onToast = _ref.onToast;
  var docInputRef = (0, _react.useRef)(null);
  var photoInputRef = (0, _react.useRef)(null);
  var _useState = (0, _react.useState)(null),
    _useState2 = _slicedToArray(_useState, 2),
    surgeryDocFile = _useState2[0],
    setSurgeryDocFile = _useState2[1];
  var _useState3 = (0, _react.useState)(null),
    _useState4 = _slicedToArray(_useState3, 2),
    rawDocFile = _useState4[0],
    setRawDocFile = _useState4[1];
  var _useState5 = (0, _react.useState)([]),
    _useState6 = _slicedToArray(_useState5, 2),
    surgeryPhotos = _useState6[0],
    setSurgeryPhotos = _useState6[1];
  var _useState7 = (0, _react.useState)([]),
    _useState8 = _slicedToArray(_useState7, 2),
    rawPhotoFiles = _useState8[0],
    setRawPhotoFiles = _useState8[1];
  var _useState9 = (0, _react.useState)(false),
    _useState10 = _slicedToArray(_useState9, 2),
    isGenerating = _useState10[0],
    setIsGenerating = _useState10[1];
  var _useState11 = (0, _react.useState)(''),
    _useState12 = _slicedToArray(_useState11, 2),
    generatedOutput = _useState12[0],
    setGeneratedOutput = _useState12[1];
  var _useState13 = (0, _react.useState)({
      pdfUrl: '',
      docxUrl: ''
    }),
    _useState14 = _slicedToArray(_useState13, 2),
    downloadLinks = _useState14[0],
    setDownloadLinks = _useState14[1];
  var _useState15 = (0, _react.useState)('p1'),
    _useState16 = _slicedToArray(_useState15, 2),
    reportPageTab = _useState16[0],
    setReportPageTab = _useState16[1];
  var _useState17 = (0, _react.useState)([]),
    _useState18 = _slicedToArray(_useState17, 2),
    modelos = _useState18[0],
    setModelos = _useState18[1];
  var _useState19 = (0, _react.useState)('todos'),
    _useState20 = _slicedToArray(_useState19, 2),
    filtroOrigem = _useState20[0],
    setFiltroOrigem = _useState20[1];
  var _useState21 = (0, _react.useState)(''),
    _useState22 = _slicedToArray(_useState21, 2),
    buscaModelo = _useState22[0],
    setBuscaModelo = _useState22[1];
  var _useState23 = (0, _react.useState)(null),
    _useState24 = _slicedToArray(_useState23, 2),
    modalMode = _useState24[0],
    setModalMode = _useState24[1];
  var _useState25 = (0, _react.useState)(null),
    _useState26 = _slicedToArray(_useState25, 2),
    modeloSelecionado = _useState26[0],
    setModeloSelecionado = _useState26[1];
  var podeEmitir = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.podeGerarCirurgia) || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'admin' || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'veterinario';
  var carregarModelos = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var res;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return _api.api.getModelosCirurgicos();
          case 3:
            res = _context.sent;
            if (res && Array.isArray(res.modelos)) {
              setModelos(res.modelos);
            }
            _context.next = 9;
            break;
          case 7:
            _context.prev = 7;
            _context.t0 = _context["catch"](0);
          case 9:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[0, 7]]);
    }));
    return function carregarModelos() {
      return _ref2.apply(this, arguments);
    };
  }();
  (0, _react.useEffect)(function () {
    carregarModelos();
  }, []);
  var handleDocSelected = function handleDocSelected(fileList) {
    var f = fileList && fileList[0];
    if (!f) return;
    setRawDocFile(f);
    setSurgeryDocFile({
      name: f.name,
      size: "".concat((f.size / 1024).toFixed(1), " KB")
    });
    onToast('Arquivo da cirurgia selecionado!');
  };
  var handlePhotosSelected = function handlePhotosSelected(fileList) {
    var arr = Array.from(fileList || []).slice(0, 5);
    if (arr.length === 0) return;
    setRawPhotoFiles(arr);
    setSurgeryPhotos(arr.map(function (f, i) {
      return {
        name: f.name,
        label: "Foto ".concat(i + 1, " (").concat((f.size / 1024).toFixed(0), " KB)"),
        previewUrl: URL.createObjectURL(f)
      };
    }));
    onToast("".concat(arr.length, " foto(s) intraoperat\xF3ria(s) anexada(s)!"));
  };
  var handleGenerate = /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      var now, dateStr, fd, res, pac, cir, textReal;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (podeEmitir) {
              _context2.next = 3;
              break;
            }
            onToast('Sua conta não possui permissão para gerar relatórios cirúrgicos.');
            return _context2.abrupt("return");
          case 3:
            if (!(!rawDocFile && rawPhotoFiles.length === 0)) {
              _context2.next = 7;
              break;
            }
            onToast('Selecione o arquivo da cirurgia (.docx, .pages, .txt ou áudio) antes de gerar.');
            if (docInputRef.current) docInputRef.current.click();
            return _context2.abrupt("return");
          case 7:
            setIsGenerating(true);
            setGeneratedOutput('');
            setDownloadLinks({
              pdfUrl: '',
              docxUrl: ''
            });
            setReportPageTab('p1');
            now = new Date();
            dateStr = "Gerado em ".concat(String(now.getDate()).padStart(2, '0'), "/").concat(String(now.getMonth() + 1).padStart(2, '0'), "/").concat(now.getFullYear(), " \xE0s ").concat(String(now.getHours()).padStart(2, '0'), ":").concat(String(now.getMinutes()).padStart(2, '0'));
            _context2.prev = 13;
            fd = new FormData();
            if (rawDocFile) fd.append('documento', rawDocFile);
            rawPhotoFiles.forEach(function (f) {
              return fd.append('fotos', f);
            });
            _context2.next = 19;
            return _api.api.gerarCirurgia(fd);
          case 19:
            res = _context2.sent;
            pac = res.paciente || {};
            cir = res.cirurgia || {};
            textReal = "RELAT\xD3RIO CIR\xDARGICO OFICIAL \u2014 ".concat((userProfile.clinicName || 'UPA PET').toUpperCase(), "\n") + "Cirurgi\xE3(o) Respons\xE1vel: ".concat(userProfile.name, " (").concat(userProfile.crmv, ")\n") + "Paciente: ".concat(pac.nome || 'Paciente', " (").concat(pac.especie || 'Canina', ") | Procedimento: ").concat(cir.procedimento || 'Procedimento Cirúrgico', "\n") + "--------------------------------------------------------------------------------\n" + "1. DIAGN\xD3STICO PR\xC9-CIR\xDARGICO:\n".concat(cir.diagnosticoPreCirurgico || 'A critério clínico.', "\n\n") + "2. DESCRI\xC7\xC3O T\xC9CNICA DO PROCEDIMENTO:\n".concat(cir.descricaoProcedimento || 'Procedimento realizado conforme protocolo institucional.', "\n\n") + "3. EVOLU\xC7\xC3O E CONSIDERA\xC7\xD5ES:\n".concat(cir.evolucaoConsideracoes || 'Paciente encaminhado para recuperação.');
            setGeneratedOutput(textReal);
            setDownloadLinks({
              pdfUrl: res.pdfUrl || '',
              docxUrl: res.docxUrl || ''
            });
            onAddActivity({
              id: "cirurg-".concat(Date.now()),
              type: 'relatorio',
              title: "Relat\xF3rio Cir\xFArgico \u2014 ".concat(cir.procedimento || 'Oficial'),
              patient: "".concat(pac.nome || 'Paciente', " (").concat(pac.especie || 'Canina', ")"),
              tutor: pac.tutor || '',
              date: dateStr,
              status: 'Concluído',
              summary: textReal,
              pdfUrl: res.pdfUrl,
              docxUrl: res.docxUrl
            });
            onToast('Relatório Cirúrgico Oficial concluído com sucesso!');
            _context2.next = 32;
            break;
          case 29:
            _context2.prev = 29;
            _context2.t0 = _context2["catch"](13);
            onToast('Erro ao processar cirurgia: ' + _context2.t0.message);
          case 32:
            _context2.prev = 32;
            setIsGenerating(false);
            return _context2.finish(32);
          case 35:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[13, 29, 32, 35]]);
    }));
    return function handleGenerate() {
      return _ref3.apply(this, arguments);
    };
  }();
  var handleClonarModelo = /*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(id) {
      var _res$modelo, res;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return _api.api.clonarModeloCirurgico(id);
          case 3:
            res = _context3.sent;
            onToast("Modelo duplicado para seu perfil como \"".concat(((_res$modelo = res.modelo) === null || _res$modelo === void 0 ? void 0 : _res$modelo.nome) || 'Meu Modelo', "\"!"));
            _context3.next = 7;
            return carregarModelos();
          case 7:
            _context3.next = 12;
            break;
          case 9:
            _context3.prev = 9;
            _context3.t0 = _context3["catch"](0);
            onToast('Erro ao duplicar modelo: ' + _context3.t0.message);
          case 12:
          case "end":
            return _context3.stop();
        }
      }, _callee3, null, [[0, 9]]);
    }));
    return function handleClonarModelo(_x2) {
      return _ref4.apply(this, arguments);
    };
  }();
  var modelosFiltrados = modelos.filter(function (m) {
    if (filtroOrigem === 'globais' && !m.isGlobal) return false;
    if (filtroOrigem === 'meus' && m.isGlobal) return false;
    var q = buscaModelo.toLowerCase().trim();
    if (!q) return true;
    var nome = (m.nome || '').toLowerCase();
    var proc = (m.procedimento || '').toLowerCase();
    var desc = (m.descricaoProcedimento || '').toLowerCase();
    var sin = Array.isArray(m.sinonimos) ? m.sinonimos.join(' ').toLowerCase() : '';
    return nome.includes(q) || proc.includes(q) || desc.includes(q) || sin.includes(q);
  });
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ".concat(darkMode ? 'bg-[#0F1C26] border-[#1E3545] text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("h2", {
    className: "text-lg sm:text-xl font-extrabold tracking-tight"
  }, "Relat\xF3rio Cir\xFArgico Oficial"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ".concat(darkMode ? 'text-slate-300' : 'text-[#52657A]')
  }, "Envie o documento da cirurgia (.docx, .pages, .txt ou \xE1udio gravado) e fotos anexas opcionais.")), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onOpenProfile,
    className: "self-start px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-[#E3FAF2] text-[#0D5C56] border border-[#00D296]/40 shrink-0"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.User, {
    className: "w-4 h-4 text-[#00A878]"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Timbre: ", userProfile.crmv))), /*#__PURE__*/_react["default"].createElement("input", {
    ref: docInputRef,
    type: "file",
    accept: ".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus",
    className: "hidden",
    onChange: function onChange(e) {
      return handleDocSelected(e.target.files);
    }
  }), /*#__PURE__*/_react["default"].createElement("input", {
    ref: photoInputRef,
    type: "file",
    multiple: true,
    accept: "image/*",
    className: "hidden",
    onChange: function onChange(e) {
      return handlePhotosSelected(e.target.files);
    }
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 mb-5"
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 ".concat(darkMode ? 'text-slate-200' : 'text-[#1E2D3D]')
  }, "1. FICHA CIR\xDARGICA OU \xC1UDIO"), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return docInputRef.current && docInputRef.current.click();
    },
    onDragOver: function onDragOver(e) {
      return e.preventDefault();
    },
    onDrop: function onDrop(e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleDocSelected(e.dataTransfer.files);
      }
    },
    className: "rounded-2xl border-2 border-dashed py-8 px-5 text-center cursor-pointer transition group ".concat(darkMode ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]' : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-center mb-2.5"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-14 h-14 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C7F0E3] text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.SurgicalFilePulseIcon, {
    className: "w-10 h-10"
  }))), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm sm:text-base font-extrabold"
  }, "Selecione o arquivo da cirurgia"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs mt-1 font-medium ".concat(darkMode ? 'text-slate-300/80' : 'text-[#52657A]')
  }, "Word (.docx), Pages (.pages), Texto (.txt) ou \xC1udios (.m4a, .mp3, .wav, .ogg)"), surgeryDocFile && /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "mt-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-[#00D296]/20 border border-[#00D296] text-xs font-extrabold text-[#00D296]"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.CheckCircle2, {
    className: "w-4 h-4"
  }), /*#__PURE__*/_react["default"].createElement("span", null, surgeryDocFile.name), /*#__PURE__*/_react["default"].createElement("span", {
    className: "opacity-75"
  }, "(", surgeryDocFile.size, ")")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 mb-5"
  }, /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 ".concat(darkMode ? 'text-slate-200' : 'text-[#1E2D3D]')
  }, "2. FOTOS INTRAOPERAT\xD3RIAS / PE\xC7A CIR\xDARGICA (OPCIONAL - P\xC1GINA 2)"), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return photoInputRef.current && photoInputRef.current.click();
    },
    className: "rounded-2xl border py-5 px-5 text-center cursor-pointer transition group ".concat(darkMode ? 'bg-[#0C1822]/90 border-[#24394B] hover:border-[#00D296]' : 'bg-[#F5F9FA] border-slate-300 hover:border-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-center mb-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CameraSolidIcon, {
    className: "w-7 h-7 transition group-hover:scale-105 ".concat(darkMode ? 'text-slate-200' : 'text-[#0D5C56]')
  })), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs sm:text-sm font-bold ".concat(darkMode ? 'text-slate-200' : 'text-[#2C3E50]')
  }, "Clique para adicionar fotos da pe\xE7a cir\xFArgica ou procedimento"), surgeryPhotos.length > 0 && /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "mt-3 flex flex-wrap items-center justify-center gap-2"
  }, surgeryPhotos.map(function (photo, index) {
    return /*#__PURE__*/_react["default"].createElement("span", {
      key: index,
      className: "px-3 py-1 rounded-lg bg-[#00D296]/15 border border-[#00D296]/40 text-[11px] font-bold text-[#00D296]"
    }, "\uD83D\uDCF7 ", photo.name, " (", photo.label, ")");
  })))), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: handleGenerate,
    disabled: isGenerating || !podeEmitir,
    className: "relative z-10 w-full py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ".concat(!podeEmitir ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : darkMode ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110' : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110')
  }, !podeEmitir ? /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_lucideReact.Lock, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Gera\xE7\xE3o Cir\xFArgica Bloqueada (Sem Permiss\xE3o)")) : /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_lucideReact.Wand2, {
    className: "w-5 h-5 ".concat(isGenerating ? 'animate-spin' : '')
  }), /*#__PURE__*/_react["default"].createElement("span", null, isGenerating ? 'Identificando procedimento e aplicando modelos cirúrgicos...' : 'Gerar Relatório Cirúrgico Oficial')))), generatedOutput && /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-5 sm:p-6 rounded-2xl border space-y-4 transition ".concat(darkMode ? 'bg-[#0F1C26] border-[#00D296]/40' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
    size: 22,
    dark: darkMode,
    textSize: "text-base"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-xs font-bold text-[#00D296]"
  }, "\u2022 Relat\xF3rio Cir\xFArgico Conclu\xEDdo!")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setReportPageTab('p1');
    },
    className: "px-3 py-1 rounded-lg text-xs font-extrabold ".concat(reportPageTab === 'p1' ? 'bg-[#00D296] text-[#062E2B]' : 'bg-slate-500/10 text-slate-400')
  }, "P\xE1gina 1: Documento Oficial"), surgeryPhotos.length > 0 && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setReportPageTab('p2');
    },
    className: "px-3 py-1 rounded-lg text-xs font-extrabold ".concat(reportPageTab === 'p2' ? 'bg-[#00D296] text-[#062E2B]' : 'bg-slate-500/10 text-slate-400')
  }, "P\xE1gina 2: Fotos da Cirurgia (", surgeryPhotos.length, ")"))), reportPageTab === 'p1' ? /*#__PURE__*/_react["default"].createElement("pre", {
    className: "text-xs leading-relaxed whitespace-pre-wrap font-sans p-4 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, generatedOutput) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-3"
  }, surgeryPhotos.map(function (img, i) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: i,
      className: "p-3 rounded-xl border text-center ".concat(darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200')
    }, /*#__PURE__*/_react["default"].createElement("div", {
      className: "h-24 rounded-lg bg-gradient-to-br from-[#0D3131] to-[#08151E] flex flex-col items-center justify-center text-[#00D296] mb-2 border border-teal-500/20 overflow-hidden"
    }, img.previewUrl ? /*#__PURE__*/_react["default"].createElement("img", {
      src: img.previewUrl,
      alt: img.name,
      className: "w-full h-full object-cover"
    }) : /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.UltrasoundIcon, {
      className: "w-6 h-6 mb-1"
    }), /*#__PURE__*/_react["default"].createElement("span", {
      className: "text-[10px] font-bold"
    }, img.label))), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-[11px] font-bold truncate"
    }, img.name));
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 pt-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onNavigateHome,
    className: "text-xs font-bold text-slate-400 hover:text-white"
  }, "\u2190 Voltar ao In\xEDcio"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, downloadLinks.docxUrl && /*#__PURE__*/_react["default"].createElement("a", {
    href: downloadLinks.docxUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileCheck, {
    className: "w-4 h-4"
  }), " Baixar Relat\xF3rio em Word (.docx)"), downloadLinks.pdfUrl && /*#__PURE__*/_react["default"].createElement("a", {
    href: downloadLinks.pdfUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Download, {
    className: "w-4 h-4"
  }), " Baixar Relat\xF3rio em PDF")))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "rounded-2xl p-5 sm:p-6 border space-y-4 ".concat(darkMode ? 'bg-[#0F1C26] border-[#1E3545]' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Stethoscope, {
    className: "w-4 h-4 text-[#00D296]"
  }), /*#__PURE__*/_react["default"].createElement("h3", {
    className: "text-base font-extrabold"
  }, "Modelos Cir\xFArgicos Padronizados"), /*#__PURE__*/_react["default"].createElement("span", {
    className: "px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#00D296]/15 text-[#00D296]"
  }, modelos.length, " modelo(s)")), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Modelos institucionais da plataforma e seus modelos personalizados para estrutura\xE7\xE3o autom\xE1tica pela IA.")), podeEmitir && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      setModeloSelecionado(null);
      setModalMode('form');
    },
    className: "px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 self-start sm:self-auto"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Plus, {
    className: "w-4 h-4"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Novo Modelo Cir\xFArgico"))), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-col sm:flex-row gap-2"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex gap-1.5"
  }, [{
    id: 'todos',
    label: 'Todos'
  }, {
    id: 'globais',
    label: '🌐 Institucionais'
  }, {
    id: 'meus',
    label: '🔒 Meus Modelos'
  }].map(function (f) {
    return /*#__PURE__*/_react["default"].createElement("button", {
      key: f.id,
      type: "button",
      onClick: function onClick() {
        return setFiltroOrigem(f.id);
      },
      className: "px-3 py-1.5 rounded-xl text-xs font-extrabold transition ".concat(filtroOrigem === f.id ? 'bg-[#00D296] text-[#062E2B]' : darkMode ? 'bg-[#0A141D] text-slate-300' : 'bg-slate-100 text-slate-700')
    }, f.label);
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative flex-1"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Search, {
    className: "w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400"
  }), /*#__PURE__*/_react["default"].createElement("input", {
    type: "text",
    value: buscaModelo,
    onChange: function onChange(e) {
      return setBuscaModelo(e.target.value);
    },
    placeholder: "Buscar por procedimento, sin\xF4nimo ou palavra-chave...",
    className: "w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border font-semibold ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-[#0A141D]')
  }))), modelosFiltrados.length === 0 ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "py-8 text-center rounded-xl border border-dashed text-xs text-slate-400 ".concat(darkMode ? 'border-slate-800 bg-[#0A141D]/50' : 'border-slate-200 bg-slate-50')
  }, "Nenhum modelo cir\xFArgico encontrado para este filtro.") : /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1"
  }, modelosFiltrados.map(function (m) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: m.id,
      className: "p-4 rounded-xl border flex flex-col justify-between transition ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 hover:border-[#00D296]/50' : 'bg-slate-50/70 border-slate-200 hover:border-[#0D5C56]/50')
    }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("div", {
      className: "flex items-start justify-between gap-2 mb-1"
    }, /*#__PURE__*/_react["default"].createElement("h4", {
      className: "text-xs font-extrabold truncate"
    }, m.nome), /*#__PURE__*/_react["default"].createElement("span", {
      className: "text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ".concat(m.isGlobal ? 'bg-[#00D296]/15 text-[#00D296]' : 'bg-purple-500/20 text-purple-300')
    }, m.isGlobal ? '🌐 Institucional' : '🔒 Meu Modelo')), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-[11px] text-[#00D296] font-bold mb-2 truncate"
    }, m.procedimento || m.nome), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3"
    }, (m.descricaoProcedimento || '').substring(0, 130), "...")), /*#__PURE__*/_react["default"].createElement("div", {
      className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-700/30"
    }, /*#__PURE__*/_react["default"].createElement("button", {
      type: "button",
      onClick: function onClick() {
        setModeloSelecionado(m);
        setModalMode('view');
      },
      className: "px-2.5 py-1 rounded-lg text-xs font-bold text-[#00D296] hover:bg-[#00D296]/10 flex items-center gap-1"
    }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Eye, {
      className: "w-3.5 h-3.5"
    }), " Detalhes"), podeEmitir && m.isGlobal && /*#__PURE__*/_react["default"].createElement("button", {
      type: "button",
      onClick: function onClick() {
        return handleClonarModelo(m.id);
      },
      className: "px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1"
    }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Copy, {
      className: "w-3.5 h-3.5"
    }), " Duplicar"), podeEmitir && (!m.isGlobal || userProfile.role === 'admin') && /*#__PURE__*/_react["default"].createElement("button", {
      type: "button",
      onClick: function onClick() {
        setModeloSelecionado(m);
        setModalMode('form');
      },
      className: "px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/10"
    }, "Editar")));
  }))), /*#__PURE__*/_react["default"].createElement(_ModeloCirurgicoModal["default"], {
    darkMode: darkMode,
    mode: modalMode,
    modelo: modeloSelecionado,
    canEdit: podeEmitir && modeloSelecionado && (!modeloSelecionado.isGlobal || userProfile.role === 'admin'),
    onClose: function onClose() {
      return setModalMode(null);
    },
    onSaved: carregarModelos,
    onSwitchToEdit: function onSwitchToEdit(mod) {
      setModeloSelecionado(mod);
      setModalMode('form');
    },
    onToast: onToast
  }));
}
  };
  modules["./pages/UltrasoundGenerator"] = function(require, module, exports) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = UltrasoundGenerator;
var _react = _interopRequireWildcard(require("react"));
var _lucideReact = require("lucide-react");
var _VetaroIcons = require("../components/icons/VetaroIcons");
var _LayoutEditorDrawer = _interopRequireDefault(require("../components/modals/LayoutEditorDrawer"));
var _api = require("../services/api");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function UltrasoundGenerator(_ref) {
  var darkMode = _ref.darkMode,
    userProfile = _ref.userProfile,
    layoutConfig = _ref.layoutConfig,
    setLayoutConfig = _ref.setLayoutConfig,
    onOpenProfile = _ref.onOpenProfile,
    onNavigateHome = _ref.onNavigateHome,
    onAddActivity = _ref.onAddActivity,
    onToast = _ref.onToast;
  var fileInputRef = (0, _react.useRef)(null);
  var _useState = (0, _react.useState)(false),
    _useState2 = _slicedToArray(_useState, 2),
    layoutEditorOpen = _useState2[0],
    setLayoutEditorOpen = _useState2[1];
  var _useState3 = (0, _react.useState)([]),
    _useState4 = _slicedToArray(_useState3, 2),
    mindrayFiles = _useState4[0],
    setMindrayFiles = _useState4[1];
  var _useState5 = (0, _react.useState)([]),
    _useState6 = _slicedToArray(_useState5, 2),
    rawFiles = _useState6[0],
    setRawFiles = _useState6[1];
  var _useState7 = (0, _react.useState)(false),
    _useState8 = _slicedToArray(_useState7, 2),
    isGenerating = _useState8[0],
    setIsGenerating = _useState8[1];
  var _useState9 = (0, _react.useState)(''),
    _useState10 = _slicedToArray(_useState9, 2),
    generatedOutput = _useState10[0],
    setGeneratedOutput = _useState10[1];
  var _useState11 = (0, _react.useState)({
      pdfUrl: '',
      docxUrl: ''
    }),
    _useState12 = _slicedToArray(_useState11, 2),
    downloadLinks = _useState12[0],
    setDownloadLinks = _useState12[1];
  var _useState13 = (0, _react.useState)('p1'),
    _useState14 = _slicedToArray(_useState13, 2),
    reportPageTab = _useState14[0],
    setReportPageTab = _useState14[1];
  var podeEmitir = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.podeGerarLaudos) || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'admin' || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'veterinario';
  var handleFilesSelected = function handleFilesSelected(fileList) {
    var arr = Array.from(fileList || []).slice(0, 25);
    if (arr.length === 0) return;
    setRawFiles(arr);
    setMindrayFiles(arr.map(function (f) {
      return {
        name: f.name,
        measure: "".concat((f.size / 1024).toFixed(0), " KB"),
        previewUrl: URL.createObjectURL(f)
      };
    }));
    onToast("".concat(arr.length, " imagem(ns) selecionada(s) para an\xE1lise!"));
  };
  var handleGenerate = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var now, dateStr, fd, res, pac, resumoReal;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (podeEmitir) {
              _context.next = 3;
              break;
            }
            onToast('Sua conta não possui permissão para gerar laudos.');
            return _context.abrupt("return");
          case 3:
            if (!(rawFiles.length === 0)) {
              _context.next = 7;
              break;
            }
            onToast('Selecione pelo menos uma captura de ultrassom antes de gerar o laudo.');
            if (fileInputRef.current) fileInputRef.current.click();
            return _context.abrupt("return");
          case 7:
            setIsGenerating(true);
            setGeneratedOutput('');
            setDownloadLinks({
              pdfUrl: '',
              docxUrl: ''
            });
            setReportPageTab('p1');
            now = new Date();
            dateStr = "Gerado em ".concat(String(now.getDate()).padStart(2, '0'), "/").concat(String(now.getMonth() + 1).padStart(2, '0'), "/").concat(now.getFullYear(), " \xE0s ").concat(String(now.getHours()).padStart(2, '0'), ":").concat(String(now.getMinutes()).padStart(2, '0'));
            _context.prev = 13;
            fd = new FormData();
            rawFiles.forEach(function (f) {
              return fd.append('imagens', f);
            });
            _context.next = 18;
            return _api.api.gerarUltrassom(fd);
          case 18:
            res = _context.sent;
            pac = res.paciente || {};
            resumoReal = "LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL\n" + "Paciente: ".concat(pac.nome || 'Não identificado', " (").concat(pac.especie || 'Canina').concat(pac.idade ? ", ".concat(pac.idade) : '', ") | Tutor: ").concat(pac.tutor || 'Não informado', "\n") + "Respons\xE1vel T\xE9cnico: ".concat(userProfile.name, " (").concat(userProfile.crmv, ") \u2014 ").concat(userProfile.clinicName, "\n") + "--------------------------------------------------------------------------------\n" + "Laudo oficial em PDF e Word (.docx) compilado com sucesso a partir de ".concat(rawFiles.length, " captura(s) do aparelho.");
            setGeneratedOutput(resumoReal);
            setDownloadLinks({
              pdfUrl: res.pdfUrl || '',
              docxUrl: res.docxUrl || ''
            });
            onAddActivity({
              id: "ultra-".concat(Date.now()),
              type: 'ultrassom',
              title: 'Laudo de Ultrassom',
              patient: "".concat(pac.nome || 'Paciente', " (").concat(pac.especie || 'Canina', ")"),
              tutor: pac.tutor || '',
              date: dateStr,
              status: 'Concluído',
              summary: resumoReal,
              pdfUrl: res.pdfUrl,
              docxUrl: res.docxUrl
            });
            onToast('Laudo Oficial de Ultrassom gerado com sucesso!');
            _context.next = 30;
            break;
          case 27:
            _context.prev = 27;
            _context.t0 = _context["catch"](13);
            onToast('Erro ao processar ultrassom: ' + _context.t0.message);
          case 30:
            _context.prev = 30;
            setIsGenerating(false);
            return _context.finish(30);
          case 33:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[13, 27, 30, 33]]);
    }));
    return function handleGenerate() {
      return _ref2.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ".concat(darkMode ? 'bg-[#0F1C26] border-[#1E3545] text-white' : 'bg-white border-slate-200 text-[#0A141D]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CardWaveBackground, {
    dark: darkMode
  }), /*#__PURE__*/_react["default"].createElement("div", {
    className: "relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6"
  }, /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("h2", {
    className: "text-lg sm:text-xl font-extrabold tracking-tight"
  }, "Laudo de Ultrassonografia Abdominal"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ".concat(darkMode ? 'text-slate-300' : 'text-[#52657A]')
  }, "Envie as capturas de tela do Mindray com calipers e identifica\xE7\xF5es para an\xE1lise autom\xE1tica.")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2.5 shrink-0"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onOpenProfile,
    className: "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40 hover:bg-[#ccf5e7]"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.User, {
    className: "w-4 h-4 text-[#00A878] shrink-0"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "leading-tight text-left"
  }, "Meu Perfil /", /*#__PURE__*/_react["default"].createElement("br", {
    className: "hidden sm:inline"
  }), " Marca")), podeEmitir && /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setLayoutEditorOpen(!layoutEditorOpen);
    },
    className: "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs ".concat(darkMode ? 'bg-[#EBF4FA] text-[#173A56] border-slate-300 hover:bg-white' : 'bg-[#F1F6FA] text-[#173A56] border-slate-300 hover:bg-slate-200/70')
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Palette, {
    className: "w-4 h-4 text-[#0D5C56] shrink-0"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "leading-tight text-left"
  }, "Editor de", /*#__PURE__*/_react["default"].createElement("br", {
    className: "hidden sm:inline"
  }), " Layout")))), /*#__PURE__*/_react["default"].createElement(_LayoutEditorDrawer["default"], {
    darkMode: darkMode,
    isOpen: layoutEditorOpen,
    onClose: function onClose() {
      return setLayoutEditorOpen(false);
    },
    layoutConfig: layoutConfig,
    setLayoutConfig: setLayoutConfig,
    userProfile: userProfile,
    onToast: onToast
  }), /*#__PURE__*/_react["default"].createElement("input", {
    ref: fileInputRef,
    type: "file",
    multiple: true,
    accept: "image/jpeg,image/png,image/webp,image/*",
    className: "hidden",
    onChange: function onChange(e) {
      return handleFilesSelected(e.target.files);
    }
  }), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick() {
      return fileInputRef.current && fileInputRef.current.click();
    },
    onDragOver: function onDragOver(e) {
      return e.preventDefault();
    },
    onDrop: function onDrop(e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    },
    className: "relative z-10 rounded-2xl border-2 border-dashed py-10 px-6 text-center cursor-pointer transition group ".concat(darkMode ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]' : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex justify-center mb-3"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "w-16 h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ".concat(darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C7F0E3] text-[#0D5C56]')
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.CloudUploadVetaroIcon, {
    className: "w-11 h-11"
  }))), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-sm sm:text-base font-extrabold"
  }, "Clique para selecionar as fotos ou arraste at\xE9 aqui"), /*#__PURE__*/_react["default"].createElement("p", {
    className: "text-xs mt-1 font-medium ".concat(darkMode ? 'text-slate-300/80' : 'text-[#52657A]')
  }, "Formatos aceitos: JPG, PNG, WEBP (at\xE9 25 fotos por exame)"), mindrayFiles.length > 0 && /*#__PURE__*/_react["default"].createElement("div", {
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    className: "mt-5 pt-4 border-t border-teal-500/20 flex flex-wrap items-center justify-center gap-2"
  }, mindrayFiles.map(function (file, idx) {
    return /*#__PURE__*/_react["default"].createElement("span", {
      key: idx,
      className: "px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ".concat(darkMode ? 'bg-[#0B1822] border-[#00D296]/40 text-[#00D296]' : 'bg-white border-[#0D5C56]/30 text-[#0D5C56]')
    }, /*#__PURE__*/_react["default"].createElement(_lucideReact.CheckCircle2, {
      className: "w-3.5 h-3.5 shrink-0"
    }), /*#__PURE__*/_react["default"].createElement("span", null, file.name), /*#__PURE__*/_react["default"].createElement("span", {
      className: "opacity-75 text-[10px]"
    }, "(", file.measure, ")"));
  }), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      setMindrayFiles([]);
      setRawFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    className: "text-[11px] font-bold underline text-rose-400 ml-2"
  }, "Limpar fotos"))), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: handleGenerate,
    disabled: isGenerating || !podeEmitir,
    className: "relative z-10 w-full mt-5 py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ".concat(!podeEmitir ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : darkMode ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110' : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110')
  }, !podeEmitir ? /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_lucideReact.Lock, {
    className: "w-5 h-5"
  }), /*#__PURE__*/_react["default"].createElement("span", null, "Gera\xE7\xE3o de Laudo Bloqueada (Sem Permiss\xE3o)")) : /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_lucideReact.Wand2, {
    className: "w-5 h-5 ".concat(isGenerating ? 'animate-spin' : '')
  }), /*#__PURE__*/_react["default"].createElement("span", null, isGenerating ? 'Analisando capturas do Mindray com IA e compilando PDF/DOCX (15-30s)...' : 'Gerar Laudo Oficial com IA')))), generatedOutput && /*#__PURE__*/_react["default"].createElement("div", {
    className: "p-5 sm:p-6 rounded-2xl border space-y-4 transition ".concat(darkMode ? 'bg-[#0F1C26] border-[#00D296]/40' : 'bg-white border-slate-200')
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.VetaroLogo, {
    size: 22,
    dark: darkMode,
    textSize: "text-base"
  }), /*#__PURE__*/_react["default"].createElement("span", {
    className: "text-xs font-bold text-[#00D296]"
  }, "\u2022 Laudo Gerado com Sucesso!")), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setReportPageTab('p1');
    },
    className: "px-3 py-1 rounded-lg text-xs font-extrabold ".concat(reportPageTab === 'p1' ? 'bg-[#00D296] text-[#062E2B]' : 'bg-slate-500/10 text-slate-400')
  }, "P\xE1gina 1: Resumo do Exame"), /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setReportPageTab('p2');
    },
    className: "px-3 py-1 rounded-lg text-xs font-extrabold ".concat(reportPageTab === 'p2' ? 'bg-[#00D296] text-[#062E2B]' : 'bg-slate-500/10 text-slate-400')
  }, "P\xE1gina 2: Imagens Enviadas (", mindrayFiles.length, ")"))), reportPageTab === 'p1' ? /*#__PURE__*/_react["default"].createElement("pre", {
    className: "text-xs leading-relaxed whitespace-pre-wrap font-sans p-4 rounded-xl border ".concat(darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
  }, generatedOutput) : /*#__PURE__*/_react["default"].createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-3"
  }, mindrayFiles.map(function (img, i) {
    return /*#__PURE__*/_react["default"].createElement("div", {
      key: i,
      className: "p-3 rounded-xl border text-center ".concat(darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200')
    }, /*#__PURE__*/_react["default"].createElement("div", {
      className: "h-24 rounded-lg bg-gradient-to-br from-[#0D3131] to-[#08151E] flex flex-col items-center justify-center text-[#00D296] mb-2 border border-teal-500/20 overflow-hidden"
    }, img.previewUrl ? /*#__PURE__*/_react["default"].createElement("img", {
      src: img.previewUrl,
      alt: img.name,
      className: "w-full h-full object-cover"
    }) : /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_VetaroIcons.UltrasoundIcon, {
      className: "w-6 h-6 mb-1"
    }), /*#__PURE__*/_react["default"].createElement("span", {
      className: "text-[10px] font-bold"
    }, img.measure))), /*#__PURE__*/_react["default"].createElement("p", {
      className: "text-[11px] font-bold truncate"
    }, img.name));
  })), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 pt-2"
  }, /*#__PURE__*/_react["default"].createElement("button", {
    type: "button",
    onClick: onNavigateHome,
    className: "text-xs font-bold text-slate-400 hover:text-white"
  }, "\u2190 Voltar ao In\xEDcio"), /*#__PURE__*/_react["default"].createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, downloadLinks.docxUrl && /*#__PURE__*/_react["default"].createElement("a", {
    href: downloadLinks.docxUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.FileCheck, {
    className: "w-4 h-4"
  }), " Baixar Laudo em Word (.docx)"), downloadLinks.pdfUrl && /*#__PURE__*/_react["default"].createElement("a", {
    href: downloadLinks.pdfUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
  }, /*#__PURE__*/_react["default"].createElement(_lucideReact.Download, {
    className: "w-4 h-4"
  }), " Baixar Laudo em PDF")))));
}
  };
  modules["./services/api"] = function(require, module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.api = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function requestJson(_x) {
  return _requestJson.apply(this, arguments);
}
function _requestJson() {
  _requestJson = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(url) {
    var options,
      res,
      data,
      _args = arguments;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          _context.next = 3;
          return fetch(url, _objectSpread({
            credentials: 'include'
          }, options));
        case 3:
          res = _context.sent;
          data = {};
          _context.prev = 5;
          _context.next = 8;
          return res.json();
        case 8:
          data = _context.sent;
          _context.next = 13;
          break;
        case 11:
          _context.prev = 11;
          _context.t0 = _context["catch"](5);
        case 13:
          if (res.ok) {
            _context.next = 15;
            break;
          }
          throw new Error(data.error || "Erro HTTP ".concat(res.status));
        case 15:
          return _context.abrupt("return", data);
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[5, 11]]);
  }));
  return _requestJson.apply(this, arguments);
}
var api = {
  // Autenticação e Sessão
  getAuthConfig: function getAuthConfig() {
    return requestJson('/api/auth/config');
  },
  getMe: function getMe() {
    return requestJson('/api/auth/me');
  },
  loginWithGoogle: function loginWithGoogle(credential) {
    return requestJson('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credential: credential
      })
    });
  },
  logout: function logout() {
    return requestJson('/api/auth/logout', {
      method: 'POST'
    });
  },
  // Tema Claro / Escuro sincronizado com PostgreSQL
  getTema: function getTema() {
    return requestJson('/api/usuario/tema');
  },
  saveTema: function saveTema(tema) {
    return requestJson('/api/usuario/tema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tema: tema
      })
    });
  },
  // Perfil Profissional Multi-Médico (CRMV, Clínica, Logo, Assinatura)
  updatePerfilProfissional: function updatePerfilProfissional(formData) {
    return requestJson('/api/perfil/profissional', {
      method: 'POST',
      body: formData
    });
  },
  // Histórico Multi-Tenant (Exames de Ultrassom + Relatórios Cirúrgicos)
  getHistorico: function getHistorico() {
    return requestJson('/api/historico');
  },
  // Geradores com IA Gemini
  gerarUltrassom: function gerarUltrassom(formData) {
    return requestJson('/api/ultrassom', {
      method: 'POST',
      body: formData
    });
  },
  gerarCirurgia: function gerarCirurgia(formData) {
    return requestJson('/api/cirurgia', {
      method: 'POST',
      body: formData
    });
  },
  // Biblioteca de Modelos Cirúrgicos
  getModelosCirurgicos: function getModelosCirurgicos() {
    return requestJson('/api/modelos-cirurgicos');
  },
  getModeloPorId: function getModeloPorId(id) {
    return requestJson("/api/modelos-cirurgicos/".concat(encodeURIComponent(id)));
  },
  salvarModeloCirurgico: function salvarModeloCirurgico(payload) {
    return requestJson('/api/modelos-cirurgicos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  },
  clonarModeloCirurgico: function clonarModeloCirurgico(id) {
    return requestJson("/api/modelos-cirurgicos/".concat(encodeURIComponent(id), "/clonar"), {
      method: 'POST'
    });
  },
  excluirModeloCirurgico: function excluirModeloCirurgico(id) {
    return requestJson("/api/modelos-cirurgicos/".concat(encodeURIComponent(id)), {
      method: 'DELETE'
    });
  },
  // Editor de Layout Tipográfico (PDF e DOCX)
  getLayoutConfig: function getLayoutConfig() {
    return requestJson('/api/layout-config');
  },
  saveLayoutConfig: function saveLayoutConfig(payload) {
    return requestJson('/api/layout-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  },
  resetLayoutConfig: function resetLayoutConfig() {
    return requestJson('/api/layout-config/reset', {
      method: 'POST'
    });
  },
  // Painel Administrativo RBAC
  getAdminUsuarios: function getAdminUsuarios() {
    return requestJson('/api/admin/usuarios');
  },
  updateAdminUserRole: function updateAdminUserRole(email, role) {
    return requestJson('/api/admin/usuarios/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        role: role
      })
    });
  }
};
exports.api = api;
  };
  requireMod("./main", "./main");
})();
