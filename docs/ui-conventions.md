# UI Conventions — Binding Contract for New Admin UI Work (WP 04 Tenant Settings)

Status: **binding**. Every rule below is either verified against the current frontend on
`multitenancy-integration` (anchors are `file:line` in this repo) or explicitly marked
**NEW — defined here** (contract-by-decision, no codebase precedent). An implementing agent
can be held to every checklist item. Verified at commit `34a865c95`.

---

## 1. Component style

- [ ] **Functional components + hooks only.** Named and unnamed components MUST be arrow
  functions — enforced by ESLint `react/function-component-definition` (`.eslintrc`, rule set
  to `arrow-function` for both). Canonical modern examples from the login modernization:
  - `app/javascript/src/apps/home/devise/SignIn.js:9-31` — `const SignIn = () => {…}` with
    `useContext`/`useEffect`, exported as `observer(SignIn)`.
  - `app/javascript/src/components/navigation/NavNewSession.js:90-183` (`ExtendedSignInForm`)
    — hooks (`useState`, `useCallback`, `useContext`) + `useFormValues`.
  - `app/javascript/src/apps/admin/AdminHome.js:36-82` — the admin shell itself is functional.
  - Legacy class components survive in the admin area (`MatrixManagement.js:27`,
    `ThirdPartyApp.js:11`). They are grandfathered. **Do not copy them.**
- [ ] **Naming**: PascalCase component files, `.js` extension (`.jsx` allowed per
  `react/jsx-filename-extension` in `.eslintrc`); one default-exported component per file.
- [ ] **File placement for new admin pages**: under `app/javascript/src/apps/admin/`
  (subfolder per feature when more than one file, cf. `apps/admin/devices/`,
  `apps/admin/textTemplates/`). A new admin page is registered in the `ADMIN_PAGES` array in
  `app/javascript/src/apps/admin/AdminHome.js:21-34` (key + label + component); the sidebar
  and content pane render from that array. New top-level routes (rare) go through
  `app/javascript/src/apps/routes.js` (Aviator) + `app/javascript/src/apps/AppDispatcher.js`;
  the single React entry is `app/javascript/src/apps/index.js` mounting on `#chemotion-app`.
- [ ] **Absolute imports only**, rooted at `app/javascript`
  (`import X from 'src/apps/admin/X'`). Enforced by
  `no-relative-import-paths/no-relative-import-paths` with `rootDir: "app/javascript"` and the
  import resolver `paths: ["app/javascript"]` in `.eslintrc`. No exceptions, including specs
  and stories.

## 2. State — MobX/MST only

- [ ] **All new state lives in `app/javascript/src/stores/mobx/`** as a `mobx-state-tree`
  model, composed into the singleton `RootStore`
  (`app/javascript/src/stores/mobx/RootStore.jsx:18-34`; singleton + context exported at
  `:75-76`: `export const rootStore = RootStore.create({}); export const StoreContext =
  React.createContext(rootStore);`). Never create or extend anything under `stores/alt/`.
- [ ] **Store shape**: `types.model('Name', {…}).actions((self) => ({…})).views(…)`. Async
  actions are MST `flow(function* …)` generators that `yield` fetcher calls — see
  `UserStore.jsx:284-287` (`fetchCurrentUser`) and `:368-371` (`fetchEditors`, which maps the
  matrices payload through `MatrixConfiguration.create`).
- [ ] **Extending UserStore / MatrixConfiguration**: `MatrixConfiguration` is the MST model at
  `app/javascript/src/stores/mobx/UserStore.jsx:211-238` (id, enabled, name, label,
  `configs: types.frozen({})`, include/exclude ids + users), held on the store as
  `matriceConfigs: types.array(MatrixConfiguration)` (`UserStore.jsx:275`). New tenant-setting
  fields extend these models (or a new sibling store registered in `RootStore.jsx`) — never a
  parallel non-MST cache. Note the field-name spelling in flight: model `MatrixConfiguration`,
  store field `matriceConfigs`, backend `Matrice` — keep whichever side you touch consistent.
- [ ] **Consumption pattern**: `const { userStore } = useContext(StoreContext);` inside the
  component, wrapped in `observer(...)` at export — `AppDispatcher.js:74-76,146`,
  `SignIn.js:10,31`. Never import `rootStore` directly in a component; always go through the
  context so tests can inject.
- [ ] **Reset semantics**: whole-store resets use `applySnapshot` in place, never
  `Store.create({})` replacement (in-flight flows would write to a dead node) —
  `RootStore.jsx:36-57`.
- [ ] **Test-harness injection idiom** (the current, binding one):
  - Component specs mount inside `<StoreContext.Provider value={fakeStore}>` where the fake is
    a **plain object** exposing only the members the component touches —
    `spec/javascripts/packs/src/apps/mydb/elements/labels/ElementCollectionLabels.spec.js:28-59`.
  - Store specs use the real singleton, capture the pristine snapshot at load time and
    `applySnapshot` it back in `beforeEach`, and stub **at the fetcher boundary** with sinon —
    `spec/javascripts/stores/mobx/CollectionsStore.spec.js:19,27-35`.

## 3. Data access — fetchers via ChemotionApiClient

- [ ] **One fetcher per domain concept** in `app/javascript/src/fetchers/`, a class of static
  methods, each a one-liner over `ApiClient` — canonical shape
  `app/javascript/src/fetchers/UsersFetcher.js`:

  ```js
  import ApiClient from 'src/api_clients/ChemotionApiClient';
  export default class UsersFetcher {
    static fetchCurrentUser() { return ApiClient.getJson('/api/v1/users/current'); }
    static updateUserProfile(params = {}) { return ApiClient.putJson('/api/v1/profiles', { body: params }); }
  }
  ```

- [ ] **All HTTP goes through `app/javascript/src/api_clients/ChemotionApiClient.js`**
  (`getJson`/`postJson`/`putJson`/`patchJson`/`deleteRequest`, plus `postFormData`/
  `putFormData` for uploads). It JSON-stringifies object bodies, sends
  `credentials: 'same-origin'`, resolves `204` to `null`, and takes optional
  `handleResponseSuccess`/`handleResponseError` overrides (`ChemotionApiClient.js:50-64`).
  Components and stores never call `fetch` themselves.
- [ ] **JWT-first auth is centralized**: `buildHeaders` reads
  `localStorage.getItem('chemotion-auth-token')` and sets the `Authorization` header on every
  request (`ChemotionApiClient.js:19-20`). The token is written/cleared exclusively by
  `UserStore.setAuthToken` (`UserStore.jsx:383-390`, cleared on `logout`, `:408-411`). New
  code MUST NOT read the token or set auth headers anywhere else.
- [ ] **Failure convention**: the client's default error handler resolves `undefined`; stores
  map falsy/`undefined` responses to an explicit failure result instead of throwing into the
  component — the contract is pinned by `CollectionsStore.spec.js:67-73,103-121`.

## 4. UI kit

- [ ] **react-bootstrap ~2.10** (`package.json:71`) is the component kit. In current use and
  binding for new admin UI:
  - Forms: `Form`, `Form.Group`, `Form.Label`, `Form.Control`, `Form.Check`
    (`NavNewSession.js:139-179`), with the controlled-form helper
    `useFormValues`/`submitAsForm` from `src/utilities/FormHelper.js:568,597`.
  - Feedback: `Alert` for form-level errors (`NavNewSession.js:126-128`).
  - `Button` (variants incl. project-specific `neat`), `OverlayTrigger` + `Tooltip`,
    `Container`, `Row`/`Col`, `InputGroup`, `Table` (`MatrixManagement.js:2-4`).
  - Modals: the project wrapper `src/components/common/AppModal.js` (used in
    `MatrixManagement.js:10`), not raw `Modal`.
  - Selects: `src/components/common/Select` (`Select`/`AsyncSelect`, cf.
    `MatrixManagement.js:6`), not raw react-select.
- [ ] **Tables: ag-grid Community ~33** (`package.json:26-27`), registered globally with the
  legacy theme in `app/javascript/src/agGridSetup.js`. Functional-component reference usage:
  `apps/mydb/elements/details/reactions/variationsTab/ReactionVariations.js:595-603`
  (`<AgGridReact columnDefs={…}>` with memoized column definitions).
- [ ] **Error/notification display**: toasts via
  `rootStore.notificationsStore.add({ title, message, level })`
  (`src/stores/mobx/NotificationsStore.js`, backed by react-hot-toast; levels
  `info|success|error`), rendered by `src/components/Notifications` which the admin shell
  already mounts (`AdminHome.js:77`). Inline `Alert` only for form-local validation.

## 5. Admin-UI contracts specific to WP 04 (tenant settings)

- [ ] **Write-only secret fields** (backend contract already merged, UI must match):
  - The API never returns a secret. `Entities::MatriceEntity` serializes
    `object.masked_configs` (`app/api/entities/matrice_entity.rb:12-14`); every stored or
    residual secret value appears as `Matrice::SECRET_PLACEHOLDER = '********'`
    (`app/models/matrice.rb:29,86-93`).
  - **Round-trip semantics**: submitting configs with the literal `'********'` value keeps the
    stored secret unchanged; a new non-blank value replaces it and is routed into the
    encrypted store (`app/models/matrice.rb:111-130`). Blank (`''`) means "not configured".
  - UI checklist: render secret keys (`client_secret`, `hmac_secret`, `receiving_secret`,
    `cas_api_key` — `matrice.rb:28`) as `<Form.Control type="password">` pre-filled with the
    placeholder; send the field back verbatim unless the admin typed a new value; **no reveal
    toggle, no copy button, never echo a typed secret after save**.
- [ ] **Absolute-tier settings — read-only with provenance** (backend precedent, UI is
  **NEW — defined here**): the ENV-first resolver's highest layer is "Absolute ENV …
  (operator-fixed)" (`lib/chemotion/env_config.rb:10-15`). Any setting resolved from the
  Absolute tier MUST render disabled/read-only with a provenance hint naming the source, e.g.
  "Fixed by operator (`EDITOR_DOCSERVER__CALLBACK_SERVER`)" — a muted text or tooltip next to
  the disabled control. Never render an editable control the backend will ignore.
- [ ] **Reload-class badges** (**NEW — defined here**, no codebase precedent): every setting
  row carries one of two badges: `request-time` (takes effect on the next request) or
  `save-&-restart` (needs a process restart). Use react-bootstrap `Badge`
  (`bg="success"` / `bg="warning"`). After saving any `save-&-restart` setting the page MUST
  show a persistent **"restart pending"** affordance (non-dismissable `Alert
  variant="warning"` at the top of the settings pane, listing the pending keys) until the
  backend reports the restart happened. Badge metadata comes from the settings API payload,
  never hard-coded per field in the UI.
- [ ] **Audit-events table**: backend is the append-only `AuditEvent` model
  (`app/models/audit_event.rb:13-44` — `action`, `actor_type` `user|guest|system`,
  `actor_id`, `subject_type/id`, `ip`, `metadata` jsonb with stamped `tenant`). UI conventions
  (**NEW — defined here**): a read-only `AgGridReact` grid (per §4), default sort newest
  first, columns `created_at`, `action`, `actor` (type + id), `subject`, `ip`, `metadata`
  (collapsed, expandable); server-side pagination via a dedicated fetcher; no edit/delete
  affordances of any kind — the table is evidence, not data entry.

## 6. Storybook

- [ ] Stories live in the **top-level `stories/` directory** — `.storybook/main.js` globs
  `../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)` (framework `@storybook/react-webpack5`; the
  `src` alias and alt-store stubs are wired in `webpackFinal` there).
- [ ] Format: **CSF3** — a default export with `title`/`component`/`parameters` and named
  story exports; `stories/Buttons.stories.js:40-46` is the template. Titles follow the
  atomic-design taxonomy `Subatomic/Atoms/Molecules/Organisms` (`.storybook/preview.js`
  `storySort`).
- [ ] **Every new admin component ships a story** in `stories/` (e.g.
  `stories/TenantSettings.stories.js`), including one story per notable state (secret field
  masked, Absolute-tier read-only, restart pending).

## 7. Charts / dataviz

No new chart precedent is set by this document. Any chart, graph, or dashboard work in the
admin UI MUST follow the project's dataviz guidance (the `dataviz` design guidance used by
this project's agent tooling): consult it before writing the first line of chart code, use its
validated palette rather than ad-hoc colors, and verify legibility in both light and dark
themes. Existing d3 usage (`src/components/generic/d3/BoxPlotChart.js`) predates this rule and
is not a template.

## 8. Testing

- [ ] **Mocha ~11 + `expect` + sinon + enzyme** (react-17 adapter), run via `yarn test`
  (`package.json:147` — note `NODE_PATH=./spec/javascripts:./app/javascript` is what makes
  `src/...` imports resolve in specs; setup/babel/jsdom bootstrap is
  `spec/javascripts/setup.js`). Not Jest.
- [ ] **Every new component and store gets a spec.** Placement mirrors the source tree under
  `spec/javascripts/`: stores in `spec/javascripts/stores/mobx/<Name>.spec.js`, components in
  `spec/javascripts/packs/src/apps/...` mirroring their `src` path
  (cf. `ElementCollectionLabels.spec.js`).
- [ ] Follow the two harness idioms verbatim (see §2): plain-object store injected through
  `StoreContext.Provider` for components; pristine-snapshot reset + sinon stubs at the fetcher
  boundary for stores. Unmount every mounted wrapper in `afterEach`
  (`ElementCollectionLabels.spec.js:48-69` — the mocha run shares one jsdom).
- [ ] Known gotcha: import `src/stores/mobx/RootStore` **before** the component under test in
  component specs (circular-import trap documented at
  `ElementCollectionLabels.spec.js:7-11`).

## 9. Anti-patterns — explicit bans

- **No new Haml/ERB pages.** The SPA owns the UI; the single mount point is `#chemotion-app`
  via `src/apps/index.js`. Rails views are auth/download/legacy only.
- **No alt stores or actions.** `src/stores/alt/` is frozen legacy (Storybook actively stubs
  it out, `.storybook/main.js`); all new state is MST per §2.
- **No inline `fetch`/axios/XHR** in components or stores — fetchers over
  `ChemotionApiClient` only (§3). No hand-rolled `Authorization` headers.
- **No relative imports**, anywhere, including same-folder (`allowSameFolder: false` in
  `.eslintrc`).
- **No class components** for new code (ESLint-enforced, §1). Existing class components are
  not a license.
- **Secrets are never rendered, logged, stored in MST snapshots, or exposed in Storybook
  fixtures.** Only the `'********'` placeholder ever appears client-side (§5); the backend
  guarantees it, the UI must not undermine it (e.g. no "show value" debugging aids).
