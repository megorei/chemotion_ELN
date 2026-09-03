# frozen_string_literal: true

WebMock.disable_net_connect!(
  allow_localhost: true,
  allow: [
    'chromedriver.storage.googleapis.com',
    # Chrome-for-Testing endpoints (webdrivers with Chrome >= 115)
    'googlechromelabs.github.io',
    'storage.googleapis.com',
    'edgedl.me.gvt1.com',
    'github.com', # /mozilla/geckodriver/releases'
    's3.amazonaws.com'
  ]
)
