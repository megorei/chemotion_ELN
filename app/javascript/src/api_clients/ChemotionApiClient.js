/* eslint-disable no-param-reassign */
// TODO: research if the following import can be safely removed
// import 'whatwg-fetch';

// utility functions
const buildHeaders = (headers) => {
  const returnHeaders = new Headers();

  if (headers != null) {
    Object.keys(headers).forEach((header) => {
      returnHeaders.set(header, headers[header]);
    });
  }
  const authToken = localStorage.getItem('chemotion-auth-token');
  if (authToken) { returnHeaders.set('Authorization', authToken); }
  if (!returnHeaders.has('Accept')) returnHeaders.set('Accept', 'application/json');
  if (!returnHeaders.has('Content-Type')) returnHeaders.set('Content-Type', 'application/json');

  const content_type_available = returnHeaders.has('Content-Type');
  const content_type = returnHeaders.get('Content-Type');
  const content_type_null = content_type === 'null'; // JS returns null (object primitive) when the key is not set, but 'null' if the key is present but set to null

  if (content_type_available && content_type_null) {
    console.debug('Content-Type was null - deleting it from headers');
    returnHeaders.delete('Content-Type');
  }

  return returnHeaders;
};

/**
 * Low-level request wrapper shared by every verb helper; the only place that
 * actually calls `fetch`.
 *
 * Response handling is configurable through two option callbacks:
 *
 * - `handleResponseSuccess(response)` maps the resolved `Response` to the value
 *   the returned promise resolves with. The default parses the JSON body, except
 *   that a `204 No Content` resolves to `null` — a 204 has an empty body, so
 *   `response.json()` would reject with "Unexpected end of JSON input". Override
 *   it to operate on the raw `Response` instead; e.g. an endpoint that replies
 *   `204` on success and carries no body should pass
 *   `handleResponseSuccess: (response) => response.ok` to resolve a boolean
 *   (`response.ok` over `=== 204` so it survives a later success-status change).
 * - `handleResponseError(exception)` runs on a network/parse failure.
 *
 * @param {string} apiEndpoint - request URL
 * @param {object} options - `fetch` options, plus the two handlers above
 * @returns {Promise<*>} whatever `handleResponseSuccess` returns (JSON body by
 *   default; `null` on 204)
 */
const apiRequest = (apiEndpoint, options) => {
  const globalDefaults = {
    credentials: 'same-origin',
    handleResponseSuccess: (response) => (response.status === 204 ? null : response.json()),
    handleResponseError: (exception) => { console.log(exception); },
  };
  console.debug('apiRequest', options);
  const headers = buildHeaders(options?.headers);

  options = { ...globalDefaults, ...options, headers };
  const { handleResponseSuccess, handleResponseError } = options;

  return fetch(apiEndpoint, options)
    .then(handleResponseSuccess)
    .catch(handleResponseError);
};

// default functions for 90% of use cases
const getJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'GET' };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const putJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'PUT' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

// this function assumes the body is already a form data object and does not try to typecast it
const putFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'PUT',
    headers: {
      'Content-Type': null
    }
  };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const postJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'POST' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

// this function assumes the body is already a form data object and does not try to typecast it
const postFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'POST',
    headers: {
      'Content-Type': null
    }
  };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const patchJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'PATCH' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const deleteRequest = (apiEndpoint, options = {}) => {
  const defaults = { method: 'DELETE' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const ChemotionApiClient = {
  apiRequest,
  getJson,
  putJson,
  putFormData,
  postJson,
  postFormData,
  patchJson,
  deleteRequest
};

export default ChemotionApiClient;
