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
const {_cache: cache} = require('../../lib/cache')
const { _config: config } = require('../../lib/utils')

const getSeed = (name, profileName, region, kind, seedProtected = false, seedVisible = true) => {
  return {
    metadata: {
      name
    },
    spec: {
      cloud: {
        profile: profileName,
        region
      },
      secretRef: {
        name: `seedsecret-${name}`,
        namespace: 'garden'
      },
      ingressDomain: `ingress.${region}.${kind}.example.org`,
      protected: seedProtected,
      visible: seedVisible
    }
  }
}

const getCloudProfile = (cloudProfileName, kind) => {
  const cloudProfile = {
    metadata: {
      name: `${cloudProfileName}`
    },
    spec: {}
  }

  cloudProfile.spec[kind] = {
    constraints: {
      kubernetes: {
        versions: ['1.9.0', '1.8.5']
      }
    }
  }
  return cloudProfile
}

const getDomain = (name, provider, domain) => {
  return {
    metadata: {
      name,
      annotations: {
        'dns.garden.sapcloud.io/domain': domain,
        'dns.garden.sapcloud.io/provider': provider
      }
    },
    data: {}
  }
}

const cloudProfileList = [
  getCloudProfile('infra1-profileName', 'infra1'),
  getCloudProfile('infra2-profileName', 'infra2'),
  getCloudProfile('infra3-profileName', 'infra3'),
  getCloudProfile('infra3-profileName2', 'infra3')
]

const seedList = [
  getSeed('infra1-seed', 'infra1-profileName', 'foo-east', 'infra1'),
  getSeed('infra1-seed2', 'infra1-profileName', 'foo-west', 'infra1'),
  getSeed('infra3-seed', 'infra3-profileName', 'foo-europe', 'infra3'),
  getSeed('infra3-seed2', 'infra3-profileName2', 'foo-europe', 'infra3')
]

const domainList = [
  getDomain('provider1-default-domain', 'provider1', 'domain1'),
  getDomain('provider2-default-domain', 'provider2', 'domain2')
]

const stub = {
  getCloudProfiles (sandbox) {
    const getcloudProviderKindListStub = sandbox.stub(config, 'getCloudProviderKindList')
    getcloudProviderKindListStub.returns(['infra1', 'infra2', 'infra3'])

    const getCloudProfilesStub = sandbox.stub(cache, 'getCloudProfiles')
    getCloudProfilesStub.returns(cloudProfileList)

    const getSeedsStub = sandbox.stub(cache, 'getSeeds')
    getSeedsStub.returns(seedList)
  },
  getDomains (sandbox) {
    const getDomainsStub = sandbox.stub(cache, 'getDomains')
    getDomainsStub.returns(domainList)
  }
}

module.exports = {
  stub,
  getSeed
}
