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

'use strict'

const { map, filter, find, remove } = require('lodash')
const kubernetes = require('../kubernetes')
const projects = require('./projects')

function Rbac ({auth}) {
  return kubernetes.rbac({auth})
}

function patchMemberRoleBinding (rbac, namespace, body) {
  return rbac.namespaces(namespace).rolebindings('garden-project-members').mergePatch({body})
}

function readMemberRoleBinding (rbac, namespace) {
  return rbac.namespaces(namespace).rolebindings('garden-project-members').get()
}

function fromResource ({subjects}) {
  const users = filter(subjects, ['kind', 'User'])
  return map(users, 'name')
}

exports.list = async function ({user, namespace}) {
  const rbac = Rbac(user)
  try {
    const body = await readMemberRoleBinding(rbac, namespace)
    return fromResource(body)
  } catch (e) {
    if (e.code === 404) {
      const body = await projects._createMembersClusterRole({namespace})
      return fromResource(body)
    }
    throw e
  }
}

exports.create = async function ({user, namespace, body: {name}}) {
  const rbac = Rbac(user)
  let body = await readMemberRoleBinding(rbac, namespace)
  if (!find(body.subjects, ['name', name])) {
    if (!body.subjects) {
      body.subjects = []
    }
    body.subjects.push({
      kind: 'User',
      name: name,
      apiGroup: 'rbac.authorization.k8s.io'
    })
    body = await patchMemberRoleBinding(rbac, namespace, body)
  }
  return fromResource(body)
}

exports.remove = async function ({user, namespace, name}) {
  const rbac = Rbac(user)
  let body = await readMemberRoleBinding(rbac, namespace)
  if (find(body.subjects, ['name', name])) {
    remove(body.subjects, ['name', name])
    body = await patchMemberRoleBinding(rbac, namespace, body)
  }
  return fromResource(body)
}
