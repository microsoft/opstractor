// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { View } from './views';
import { OpNode, BinaryOpNodeReader } from './data';
import { OpNodeFlameGraphView } from './opnodeflameview';
import { OpNodeTreeView } from './opnodetreeview';
import { createElement } from './util';

class ProfileView extends View<'main'> {
  constructor(rootNode: OpNode) {
    super('main');

    this.elem.classList.add('profile-view');

    const headerElem = createElement('h1');
    headerElem.innerText = rootNode.op.name;
    this.elem.appendChild(headerElem);

    this.appendView(new OpNodeFlameGraphView(rootNode));
    this.appendView(new OpNodeTreeView(rootNode));
  }
}

class FrontendSession {
  constructor() {
    this.loadProfile('/distinct_graphs.bin');
  }

  #onProfileDownloaded(buffer: ArrayBuffer) {
    const reader = new BinaryOpNodeReader(buffer);
    const rootNode = reader.readOpNode();
    document.body.appendChild(new ProfileView(rootNode).elem);
  }

  #onProfileDownloadError(error: any) {
    console.error('unable to load profile: %O', error);
  }

  loadProfile(profileDataUrl: string) {
    const httpClient = new XMLHttpRequest;
    httpClient.open('GET', profileDataUrl, true);
    httpClient.responseType = 'arraybuffer';
    httpClient.onload = _ => {
      try {
        if (httpClient.readyState !== 4) {
          return;
        } else if (httpClient.status === 200) {
          this.#onProfileDownloaded(httpClient.response);
        } else {
          this.#onProfileDownloadError(
            `HTTP ${httpClient.status} ${httpClient.statusText}: ` +
            `GET: ${profileDataUrl}`);
        }
      } catch (e) {
        this.#onProfileDownloadError(e);
      }
    };
    httpClient.onerror = _ => this.#onProfileDownloadError(
      'XMLHttpRequest onerror');
    httpClient.send(null);
  }
}

interface OpstractorHost {
  _opstractorFrontendSession?: FrontendSession;
}

window.addEventListener('DOMContentLoaded', _ => {
  const host = <OpstractorHost><any>window;
  if (!host._opstractorFrontendSession) {
    host._opstractorFrontendSession = new FrontendSession();
  }
});