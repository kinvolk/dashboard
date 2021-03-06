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

const _ = require('lodash')
const nock = require('nock')
const yaml = require('js-yaml')

const { credentials } = require('../../../lib/kubernetes')
const { encodeBase64 } = require('../../../lib/utils')
const clientConfig = credentials()
const url = clientConfig.url
const auth = clientConfig.auth

const secretBindingList = [
  getSecretBinding('foo-infra1', 'garden-foo', 'infra1-profileName', 'garden-foo', 'secret1'),
  getSecretBinding('foo-infra3', 'garden-foo', 'infra3-profileName', 'garden-foo', 'secret2'),
  getSecretBinding('trial-infra1', 'garden-foo', 'infra1-profileName', 'garden-trial', 'trial-secret')

]

const projectList = [
  getProject('foo', 'foo@example.org', 'bar@example.org', 'foo-description', 'foo-purpose'),
  getProject('bar', 'bar@example.org', 'foo@example.org', 'bar-description', 'bar-purpose'),
  getProject('secret', 'admin@example.org', 'admin@example.org', 'secret-description', 'secret-purpose')
]

const shootList = [
  getShoot({name: 'fooShoot', project: 'fooProject', createdBy: 'fooCreator', purpose: 'fooPurpose', bindingName: 'fooSecretName'}),
  getShoot({name: 'barShoot', project: 'fooProject', createdBy: 'barCreator', purpose: 'barPurpose', bindingName: 'barSecretName'}),
  getShoot({name: 'dummyShoot', project: 'fooProject', createdBy: 'fooCreator', purpose: 'fooPurpose', bindingName: 'barSecretName'})
]

const infrastructureSecretList = [
  getInfrastructureSecret('foo', 'secret1', 'infra1-profileName', {fooKey: 'fooKey', fooSecret: 'fooSecret'}),
  getInfrastructureSecret('foo', 'secret2', 'infra2-profileName', {fooKey: 'fooKey', fooSecret: 'fooSecret'})
]

const projectMembersList = [
  getProjectMembers('garden-foo', ['foo@example.org', 'bar@example.org']),
  getProjectMembers('garden-bar', ['bar@example.org', 'foo@example.org']),
  getProjectMembers('garden-secret', ['admin@example.org'])
]

const certificateAuthorityData = encodeBase64('certificate-authority-data')
const clientCertificateData = encodeBase64('client-certificate-data')
const clientKeyData = encodeBase64('client-key-data')

function getSecretBinding (name, namespace, profileName, secretRefName, secretRefNamespace, quotas = {}) {
  const secretBinding = {
    kind: 'SecretBinding',
    metadata: {
      name,
      namespace,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': profileName
      }
    },
    secretRef: {
      name: secretRefName,
      namespace: secretRefNamespace
    },
    quotas
  }

  return secretBinding
}

function prepareSecretAndBindingMeta ({name, namespace, data, resourceVersion, bindingName, bindingNamespace, cloudProfileName}) {
  const metadataSecretBinding = {
    resourceVersion,
    name: bindingName,
    namespace: bindingNamespace,
    labels: {
      'cloudprofile.garden.sapcloud.io/name': cloudProfileName
    }
  }
  const secretRef = {
    name,
    namespace
  }
  const resultSecretBinding = {
    metadata: metadataSecretBinding,
    secretRef
  }

  const metadataSecret = {
    resourceVersion,
    namespace
  }
  const resultSecret = {
    metadata: metadataSecret,
    data
  }

  return {metadataSecretBinding, secretRef, resultSecretBinding, metadataSecret, resultSecret}
}

function getProjectMembers (namespace, users) {
  const apiGroup = 'rbac.authorization.k8s.io'
  return {
    metadata: {
      name: 'garden-project-members',
      namespace,
      labels: {
        'garden.sapcloud.io/role': 'members'
      }
    },
    roleRef: {
      apiGroup,
      kind: 'ClusterRole',
      name: 'garden.sapcloud.io:system:project-member'
    },
    subjects: _.map(users, name => {
      return {
        apiGroup,
        kind: 'User',
        name
      }
    })
  }
}

function getInfrastructureSecret (project, name, profileName, data = {}) {
  return {
    metadata: {
      name,
      namespace: `garden-${project}`,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': profileName
      }
    },
    data
  }
}

function getProject (name, owner, createdBy, description, purpose) {
  return {
    metadata: {
      name: `garden-${name}`,
      labels: {
        'garden.sapcloud.io/role': 'project',
        'project.garden.sapcloud.io/name': name
      },
      annotations: {
        'project.garden.sapcloud.io/createdBy': createdBy,
        'project.garden.sapcloud.io/owner': owner,
        'project.garden.sapcloud.io/description': description,
        'project.garden.sapcloud.io/purpose': purpose
      }
    }
  }
}

function getShoot ({
  name,
  project,
  createdBy,
  purpose = 'foo-purpose',
  kind = 'fooInfra',
  profile = 'infra1-profileName',
  region = 'foo-west',
  bindingName = 'foo-secret',
  seed = 'infra1-seed'
}) {
  const shoot = {
    metadata: {
      name,
      namespace: `garden-${project}`,
      annotations: {
        'garden.sapcloud.io/purpose': purpose
      }
    },
    spec: {
      cloud: {
        profile,
        region,
        seed,
        secretBindingRef: {
          name: bindingName,
          namespace: `garden-${project}`
        }
      }
    }
  }
  shoot.spec.cloud[kind] = {}

  if (createdBy) {
    shoot.metadata.annotations['garden.sapcloud.io/createdBy'] = createdBy
  }
  return shoot
}

function getKubeconfig ({server, name}) {
  const cluster = {
    'certificate-authority-data': certificateAuthorityData,
    server
  }
  const user = {
    'client-certificate-data': clientCertificateData,
    'client-key-data': clientKeyData
  }
  const context = {
    cluster: name,
    user: name
  }
  return yaml.safeDump({
    kind: 'Config',
    clusters: [{cluster, name}],
    contexts: [{context, name}],
    users: [{user, name}],
    'current-context': name
  })
}

function authorizationHeader (bearer) {
  const authorization = `Bearer ${bearer}`
  return {authorization}
}

const stub = {
  getShoots ({bearer, namespace}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`)
      .reply(200, {
        items: shootList
      })
  },
  getShoot ({bearer, namespace, name, project, createdBy, purpose, kind, profile, region, bindingName}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, getShoot({name, project, createdBy, purpose, kind, profile, region, bindingName}))
  },
  createShoot ({bearer, namespace, spec, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const metadata = {
      resourceVersion,
      namespace
    }
    const result = {metadata, spec}

    return nock(url, {reqheaders})
      .post(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`, body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  deleteShoot ({bearer, namespace, name, project, createdBy, purpose, kind, region, bindingName, deletionTimestamp, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const metadata = {
      resourceVersion,
      namespace
    }
    const shoot = getShoot({name, project, createdBy, purpose, kind, region, bindingName, deletionTimestamp})
    shoot.metadata.deletionTimestamp = deletionTimestamp
    const result = {metadata}
    return nock(url, {reqheaders})
      .delete(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, shoot)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  getShootInfo ({
    bearer,
    namespace,
    name,
    project,
    kind,
    region,
    shootServerUrl,
    shootUser,
    shootPassword,
    seedClusterName,
    seedSecretName,
    seedName
  }) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const shootData = {
      kubeconfig: encodeBase64(getKubeconfig({
        server: shootServerUrl,
        name: 'shoot.foo.bar'
      })),
      username: encodeBase64(shootUser),
      password: encodeBase64(shootPassword)
    }
    nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, getShoot({name, project, kind, region, seed: seedName}))

    return nock(url, {reqheaders})
      .get(`/api/v1/namespaces/${namespace}/secrets/${name}.kubeconfig`)
      .reply(200, {data: shootData})
  },
  getInfrastructureSecrets ({bearer, namespace}) {
    this.stubInfrastructureSecrets({bearer, namespace, secretBindingList, infrastructureSecretList})
  },
  getNoInfrastructureSecrets ({bearer, namespace}) {
    const secretBindingList = []
    const infrastructureSecretList = []
    this.stubInfrastructureSecrets({bearer, namespace, secretBindingList, infrastructureSecretList})
  },
  stubInfrastructureSecrets ({bearer, namespace, secretBindingList, infrastructureSecretList}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/secretbindings`)
      .reply(200, {
        items: secretBindingList
      })
      .get(`/api/v1/namespaces/${namespace}/secrets`)
      .reply(200, {
        items: infrastructureSecretList
      })
  },
  createInfrastructureSecret ({bearer, namespace, data, cloudProfileName, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const {metadataSecretBinding, secretRef, resultSecretBinding, metadataSecret, resultSecret} = prepareSecretAndBindingMeta({bindingNamespace: namespace, data, resourceVersion, cloudProfileName})

    return nock(url, {reqheaders})
      .post(`/api/v1/namespaces/${namespace}/secrets`, body => {
        _.assign(metadataSecret, body.metadata)
        return true
      })
      .reply(200, () => resultSecret)
      .post(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/secretbindings`, body => {
        _.assign(metadataSecretBinding, body.metadata)
        _.assign(secretRef, body.secretRef)
        return true
      })
      .reply(200, () => {
        return resultSecretBinding
      })
  },
  patchInfrastructureSecret ({bearer, namespace, name, bindingName, bindingNamespace, data, cloudProfileName, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const {resultSecretBinding, metadataSecret, resultSecret} = prepareSecretAndBindingMeta({name, namespace, data, resourceVersion, bindingName, bindingNamespace, cloudProfileName})

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => {
        return resultSecretBinding
      })
      .patch(`/api/v1/namespaces/${namespace}/secrets/${name}`, body => {
        _.assign(metadataSecret, body.metadata)
        return true
      })
      .reply(200, () => resultSecret)
  },
  patchSharedInfrastructureSecret ({bearer, namespace, name, bindingName, bindingNamespace, data, cloudProfileName, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const {resultSecretBinding} = prepareSecretAndBindingMeta({name, namespace, data, resourceVersion, bindingName, bindingNamespace, cloudProfileName})

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => {
        return resultSecretBinding
      })
  },
  deleteInfrastructureSecret ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const fooShoot = getShoot({name: 'fooShoot', project, bindingName: 'someOtherSecretName'})

    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const { resultSecretBinding } = prepareSecretAndBindingMeta({name, namespace, resourceVersion, bindingName, bindingNamespace, cloudProfileName})

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => {
        return resultSecretBinding
      })
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/shoots`)
      .reply(200, {
        items: [fooShoot]
      })
      .delete(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200)
      .delete(`/api/v1/namespaces/${bindingNamespace}/secrets/${name}`)
      .reply(200)
  },
  deleteSharedInfrastructureSecret ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const {resultSecretBinding} = prepareSecretAndBindingMeta({name, namespace, resourceVersion, bindingName, bindingNamespace, cloudProfileName})

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => {
        return resultSecretBinding
      })
  },
  deleteInfrastructureSecretReferencedByShoot ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const referencingShoot = getShoot({name: 'referencingShoot', project, bindingName})
    const fooShoot = getShoot({name: 'fooShoot', project, bindingName: 'someOtherSecretName'})

    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const {resultSecretBinding} = prepareSecretAndBindingMeta({name, namespace, resourceVersion, bindingName, bindingNamespace, cloudProfileName})

    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => {
        return resultSecretBinding
      })
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/shoots`)
      .reply(200, {
        items: [fooShoot, referencingShoot]
      })
  },
  getProjects () {
    const reqheaders = {
      authorization: `Bearer ${auth.bearer}`
    }
    const subject = {
      kind: 'User',
      name: 'admin@example.org'
    }
    const subjects = [subject]
    return nock(url, {reqheaders})
      .get('/api/v1/namespaces')
      .query({
        labelSelector: 'garden.sapcloud.io/role=project'
      })
      .reply(200, {
        items: projectList
      })
      .get('/apis/rbac.authorization.k8s.io/v1beta1/rolebindings')
      .query({
        labelSelector: 'garden.sapcloud.io/role=members'
      })
      .reply(200, {
        items: projectMembersList
      })
      .get('/apis/rbac.authorization.k8s.io/v1beta1/clusterrolebindings/garden-administrators')
      .reply(200, {subjects})
  },
  createProject ({namespace, username, resourceVersion = 42}) {
    const bearer = auth.bearer
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const roleBindingsUrl = `/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings`
    const metadata = {
      resourceVersion
    }
    const result = {metadata}

    function matchRolebindingProjectMembers ({metadata, roleRef, subjects: [subject]}) {
      return metadata.name === 'garden-project-members' &&
        roleRef.name === 'garden.sapcloud.io:system:project-member' &&
        subject.name === username
    }

    return nock(url, {reqheaders})
      .post(roleBindingsUrl, matchRolebindingProjectMembers)
      .reply(200)
      .post('/api/v1/namespaces', body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  patchProject ({namespace, username, resourceVersion = 43}) {
    const bearer = auth.bearer
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const result = _
      .chain(projectList)
      .find(({metadata}) => metadata.name === namespace)
      .set('metadata.resourceVersion', resourceVersion)
      .value()
    const {metadata} = result
    return nock(url, {reqheaders})
      .patch(`/api/v1/namespaces/${namespace}`, body => {
        _.merge(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  deleteProject ({bearer, namespace, username}) {
    nock(url, {reqheaders: authorizationHeader(bearer)})
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`)
      .reply(200, {
        items: []
      })
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, getProjectMembers(namespace, [username, 'foo@example.org']))
    return nock(url, {reqheaders: authorizationHeader(auth.bearer)})
      .delete(`/api/v1/namespaces/${namespace}`)
      .reply(200)
  },
  getMembers ({bearer, namespace, members}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    return nock(url, {reqheaders})
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, getProjectMembers(namespace, members))
  },
  getMembersNoRolebinding ({bearer, namespace}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }

    const adminReqheaders = {
      authorization: `Bearer ${auth.bearer}`
    }

    nock(url, {reqheaders})
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(404, {})
    return nock(url, {reqheaders: adminReqheaders})
      .post(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings`)
      .reply(200, getProjectMembers(namespace, []))
  },
  addMember ({bearer, namespace, newMember, members}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const oldProjectMembers = getProjectMembers(namespace, members)
    const newProjectMembers = getProjectMembers(namespace, _.concat(members, newMember))

    const result = newProjectMembers
    return nock(url, {reqheaders})
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, oldProjectMembers)
      .patch(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`, body => {
        result.metadata = body.metadata
        return true
      })
      .reply(200, () => result)
  },
  notAddMember ({bearer, namespace, members}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const projectMembers = getProjectMembers(namespace, members)

    return nock(url, {reqheaders})
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, projectMembers)
  },
  removeMember ({bearer, namespace, removeMember, members}) {
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const oldProjectMembers = getProjectMembers(namespace, members)
    const newProjectMembers = getProjectMembers(namespace, _.without(members, removeMember))

    const result = newProjectMembers
    return nock(url, {reqheaders})
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, oldProjectMembers)
      .patch(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`, body => {
        result.metadata = body.metadata
        return true
      })
      .reply(200, () => result)
  }
}
module.exports = {
  url,
  projectList,
  projectMembersList,
  auth,
  stub
}
