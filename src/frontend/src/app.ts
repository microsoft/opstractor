// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { View } from './views';
import { OpNode, BinaryOpNodeReader } from './data';
import { OpNodeFlameGraphView } from './opnodeflameview';
import { OpNodeTreeView } from './opnodetreeview';
import { createElement } from './util';

class ProfileView extends View<'div'> {
  constructor(rootNode: OpNode) {
    super('div');

    this.elem.classList.add('profile-view');

    const headerElem = createElement('h1');
    headerElem.innerText = rootNode.op.name;
    this.elem.appendChild(headerElem);

    this.appendView(new OpNodeFlameGraphView(rootNode));
    this.appendView(new OpNodeTreeView(rootNode));
  }
}

class ProfileCollectionView extends View<'main'> {
  readonly #session: FrontendSession;
  readonly #listElem: HTMLElement;
  readonly #profileViewContainerElem: HTMLElement;
  #currentProfileView?: ProfileView;

  constructor(session: FrontendSession, profileList: string[]) {
    super('main');

    this.#session = session;
    this.#listElem = createElement('ul', 'profile-list');
    this.#profileViewContainerElem = createElement('div', 'profile-container');

    this.elem.appendChild(this.#listElem);
    this.elem.appendChild(this.#profileViewContainerElem);

    for (const profileUrl of profileList) {
      if (profileUrl) {
        const liElem = createElement('li');
        liElem.addEventListener('click', _ => {
          for (const otherLiElem of this.#listElem.children) {
            otherLiElem.classList.remove('selected');
          }
          liElem.classList.add('selected');
          this.#loadProfile(profileUrl);
        });
        liElem.innerText = this.#fixProfileName(profileUrl);
        this.#listElem.appendChild(liElem);
      }
    }
  }

  #fixProfileName(name: string): string {
    function trimStart(start: string) {
      if (name.startsWith(start)) {
        name = name.substring(start.length);
      }
    }

    function trimEnd(end: string) {
      if (name.endsWith(end)) {
        name = name.substring(0, name.length - end.length);
      }
    }

    trimStart('labml_nn.');
    trimEnd('.bin');
    trimEnd('.experiment');

    return name;
  }

  #loadProfile(profileUrl: string) {
    this.#session.loadProfile(profileUrl, buffer => {
      this.#currentProfileView?.dispose();
      this.#currentProfileView = undefined;

      const reader = new BinaryOpNodeReader(buffer);
      const rootNode = reader.readOpNode();
      this.#currentProfileView = new ProfileView(rootNode);
      this.#profileViewContainerElem.appendChild(
        this.#currentProfileView.elem);
    });
  }
}

class FrontendSession {
  constructor() {
    this.loadProfileList();
  }

  loadProfileList() {
    const httpClient = new XMLHttpRequest;
    httpClient.open('GET', '/profiles/profiles.json');
    httpClient.responseType = 'json';
    httpClient.onload = _ => {
      if (httpClient.readyState !== 4) {
        return;
      } else if (httpClient.status === 200) {
        document.body.appendChild(
          new ProfileCollectionView(this, httpClient.response).elem);
      }
    };
    httpClient.send(null);
  }

  loadProfile(
    profileDataUrl: string,
    loadedCallback: (buffer: ArrayBuffer) => void) {
    function downloadError(error: any) {
      console.error('unable to load profile: %O', error);
    }
    profileDataUrl = `/profiles/${profileDataUrl}`;
    const httpClient = new XMLHttpRequest;
    httpClient.open('GET', profileDataUrl, true);
    httpClient.responseType = 'arraybuffer';
    httpClient.onload = _ => {
      try {
        if (httpClient.readyState !== 4) {
          return;
        } else if (httpClient.status === 200) {
          loadedCallback(httpClient.response);
        } else {
          downloadError(
            `HTTP ${httpClient.status} ${httpClient.statusText}: ` +
            `GET: ${profileDataUrl}`);
        }
      } catch (e) {
        downloadError(e);
      }
    };
    httpClient.onerror = _ => downloadError('XMLHttpRequest onerror');
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