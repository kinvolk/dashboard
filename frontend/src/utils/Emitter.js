//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import io from 'socket.io-client'
import forEach from 'lodash/forEach'
import map from 'lodash/map'
import Emitter from 'component-emitter'
import {ThrottledNamespacedEventEmitter} from './ThrottledEmitter'
import store from '../store'

const url = window.location.origin
const socketConfig = {
  path: '/api/events',
  transports: ['websocket'],
  autoConnect: false
}
const shootsSocket = io(`${url}/shoots`, socketConfig)
const journalsSocket = io(`${url}/journals`, socketConfig)

/* Event Emitters */
const emitterObjForSocket = (socket) => {
  return {
    authenticated: false,
    namespace: undefined,
    filter: undefined,
    auth: {
      bearer: undefined
    },
    socket,
    setUser (user) {
      // could be overwritten
      this._setUser(user)
    },
    _setUser (user) {
      user = user || {}
      const id_token = user.id_token
        /* eslint camelcase: off */
      if (!id_token) {
        console.log(`Disconnect socket ${this.socket.id} because ID token is empty`)
        this.auth.bearer = undefined
        this.socket.disconnect()
      } else if (!this.socket.connected) {
        console.log(`Socket ${this.socket.id} not connected.`)
        this.auth.bearer = id_token
        this.socket.connect()
      } else if (this.auth.bearer !== id_token) {
        console.log(`Socket ${this.socket.id} connected but has different ID token`)
        this.auth.bearer = id_token
        const onDisconnect = (reason) => {
          console.log('ON DISCONNECT')
          if (reason === 'io client disconnect') {
            clearTimeout(timeoutId)
            this.socket.connect()
          }
        }
        const onTimeout = () => {
          this.socket.off('disconnect', onDisconnect)
        }
        const timeoutId = setTimeout(onTimeout, 1000)
        this.socket.once('disconnect', onDisconnect)
        this.socket.disconnect()
      }
    },
    setNamespace (namespace, filter) {
      this.namespace = namespace
      this.filter = filter
      store.dispatch('clearShoots')
      if (this.namespace && this.authenticated) {
        store.dispatch('setShootsLoading')
        this.subscribe({namespace, filter})
      }
    },
    authenticate () {
      console.log(`socket connection ${this.socket.id} authenticating`)
      if (this.auth.bearer) {
        this.socket.emit('authentication', this.auth)
      }
    },
    subscribe () {
      console.log('should be overwritten..', this.socket.id)
    }
  }
}

const shootsEmitterObj = emitterObjForSocket(shootsSocket)
shootsEmitterObj.subscribe = async function ({namespace, filter}) {
  if (namespace === '_all') {
    const allNamespaces = await store.getters.namespaces
    const namespaces = map(allNamespaces, (namespace) => { return {namespace, filter} })
    this.socket.emit('subscribe', {namespaces})
  } else if (namespace) {
    this.socket.emit('subscribe', {namespaces: [{namespace, filter}]})
  }
}

const journalsEmitterObj = emitterObjForSocket(journalsSocket)
journalsEmitterObj.setUser = function (user) {
  if (!store.getters.isAdmin) {
    return
  }
  this._setUser(user)
}
journalsEmitterObj.subscribe = function () {
  if (store.getters.isAdmin) {
    this.socket.emit('subscribeIssues')
  }
}
journalsEmitterObj.subscribeComments = function ({name, namespace}) {
  if (store.getters.isAdmin) {
    this.socket.emit('subscribeComments', {name, namespace})
    this.subscribedComments = true
  }
}
journalsEmitterObj.unsubscribeComments = function () {
  if (store.getters.isAdmin) {
    if (this.subscribedComments) {
      this.socket.emit('unsubscribeComments')
      this.subscribedComments = false
    }
  }
}

const shootsEmitter = Emitter(shootsEmitterObj)
const journalsEmitter = Emitter(journalsEmitterObj)

const emitters = [shootsEmitter, journalsEmitter]

function onAuthenticated () {
  this.authenticated = true
  this.emit('authenticated')
  console.log(`socket connection ${this.socket.id} authenticated`)

  this.socket.on('events', ({kind, events}) => {
    this.emit(kind, events)
  })

  /* currently we only throttle NamespacedEvents (for shoots) as for this kind
  * we expect many events coming in in a short period of time */
  const throttledNsEventEmitter = new ThrottledNamespacedEventEmitter({emitter: this, wait: 1000})

  this.socket.on('namespacedEvents', ({kind, namespaces}) => {
    throttledNsEventEmitter.emit(kind, namespaces)
  })
  this.socket.on('batchNamespacedEventsDone', ({kind, namespaces}) => {
    if (kind === 'shoots') {
      store.dispatch('unsetShootsLoading', namespaces)
      throttledNsEventEmitter.flush()
    }
  })

  const namespace = this.namespace
  const filter = undefined
  this.subscribe({namespace, filter})
}

function onConnect (attempt) {
  if (attempt) {
    console.log(`socket connection ${this.socket.id} established after '${attempt}' attempt(s)`)
  } else {
    console.log(`socket connection ${this.socket.id} established`)
  }
  this.authenticate()
}

function onDisconnect (reason) {
  console.error(`socket connection lost because`, reason)
  this.authenticated = false
  this.socket.off('event')
  this.emit('disconnect', reason)
}

/* Web Socket Connection */

forEach(emitters, emitter => {
  emitter.socket.on('connect', attempt => onConnect.call(emitter, attempt))
  emitter.socket.on('reconnect', attempt => onConnect.call(emitter, attempt))
  emitter.socket.on('authenticated', () => onAuthenticated.call(emitter))
  emitter.socket.on('disconnect', reason => onDisconnect.call(emitter, reason))
  emitter.socket.on('connect_error', err => {
    console.error(`socket connection error ${err}`)
  })
  emitter.socket.on('connect_timeout', () => {
    console.error(`socket ${emitter.socket.id} connection timeout`)
  })
  emitter.socket.on('reconnect_attempt', () => {
    console.log(`socket ${emitter.socket.id} reconnect attempt`)
  })
  emitter.socket.on('reconnecting', attempt => {
    console.log(`socket ${emitter.socket.id} reconnecting attempt number '${attempt}'`)
  })
  emitter.socket.on('reconnect_error', err => {
    console.error(`socket ${emitter.socket.id} reconnect error ${err}`)
  })
  emitter.socket.on('reconnect_failed', () => {
    console.error(`socket ${emitter.socket.id} couldn't reconnect`)
  })
  emitter.socket.on('error', err => {
    console.error(`socket ${emitter.socket.id} error ${err}`)
  })
})

const wrapper = {
  setUser (user) {
    forEach(emitters, emitter => emitter.setUser(user))
  },
  shootsEmitter,
  journalsEmitter
}

window.GARDEN = {emitter: shootsEmitter}

export default wrapper
