/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript for Gallery.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Gallery');

goog.require('BlocklyGames');
goog.require('BlocklyGames.Msg');
goog.require('BlocklyStorage');
goog.require('Gallery.html');


BlocklyGames.NAME = 'gallery';

/**
 * One of 'turtle', 'movie', 'music', or 'admin'.
 * @type string
 */
let app;

/**
 * Initialize gallery.  Called on page load.
 */
function init() {
  app = BlocklyGames.getStringParamFromUrl('app', '');
  const isAdmin = (app === 'admin');
  if (!isAdmin && !['turtle', 'movie', 'music'].includes(app)) {
    throw Error('Unknown app: ' + app);
  }
  if (isAdmin) {
    document.body.className = 'admin';
  }
  // Render the HTML.
  const appName = isAdmin ? '' : (BlocklyGames.Msg['Games.' + app] + ' : ');
  document.body.innerHTML += Gallery.html.start(
      {lang: BlocklyGames.LANG,
       appName: appName,
       html: BlocklyGames.IS_HTML});

  loadMore();
  BlocklyGames.init(BlocklyGames.Msg['Gallery']);

  const languageMenu = document.getElementById('languageMenu');
  languageMenu.addEventListener('change', BlocklyGames.changeLanguage, true);
  // Poll for needing more records.
  setInterval(needMore, 200);
}

/**
 * Flag for whether the server has more rows of data.
 */
let hasMore = true;

/**
 * Flag for whether gallery is waiting on loading request.
 */
let loadRequested_ = false;

/**
 * Opaque key to current data loading cursor.
 */
let cursor = '';

/**
 * Load more entries.
 */
function loadMore() {
  if (loadRequested_ || !hasMore) {
    return;
  }

  document.getElementById('loading').style.visibility = 'visible';
  let url = '/gallery-api/view?app=' + encodeURIComponent(app);
  if (cursor) {
    url += '&cursor=' + encodeURIComponent(cursor);
  }
  const onFailure = function() {
    console.warn('Load returned status ' + this.status);
    loadRequested_ = false;
    hasMore = false;
    if (this.status === 401) {
      // User isn't logged in.  Bounce to the admin page.
      location = '/admin';
    }
  };
  BlocklyStorage.makeRequest(url, '', receiveMore, onFailure, 'GET');
  loadRequested_ = true;
}

/**
 * Receive entries from the Gallery server.
 */
function receiveMore() {
  loadRequested_ = false;
  document.getElementById('loading').style.visibility = 'hidden';
  const meta = JSON.parse(this.responseText);
  if (!meta['more']) {
    hasMore = false;
  }
  cursor = meta['cursor'];

  meta['data'].forEach(display);
}

/**
 * Display one more record to the gallery.
 * @param {!Object} record One art record.
 */
function display(record) {
  const block = document.createElement('div');
  block.innerHTML = Gallery.html.record(record['app'], record['uuid'],
      record['thumb'], record['title'], record['public'], record['key']);
  document.getElementById('gallery').appendChild(block);
}

/**
 * Publish or unpublish a record.
 * @param {!Element} element Checkbox element.
 */
function publish(element) {
  const key = element.id.substring(8);
  const publish = Number(element.checked);
  const url = '/gallery-api/admin';
  const data = 'key=' + encodeURIComponent(key) + '&public=' + publish;
  BlocklyStorage.makeRequest(url, data);
}

/**
 * Automatically load more records if the screen is scrolled to the bottom.
 */
function needMore() {
  const rect = document.getElementById('loading').getBoundingClientRect();
  if (rect.top <=
      (window.innerHeight || document.documentElement.clientHeight)) {
    loadMore();
  }
}

BlocklyGames.callWhenLoaded(init);

// Export symbols that would otherwise be renamed by Closure compiler.
window['publish'] = publish;
