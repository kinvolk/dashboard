<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <tr>
    <td class="nowrap" v-if="this.headerVisible['project']">
      <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootList', params: { namespace:row.namespace } }">
        {{ projectName }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
        {{ row.name }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['infrastructure']">
      <v-tooltip top>
        <div slot="activator">
          <infra-icon v-model="row.kind"></infra-icon>
          {{ row.region }}
        </div>
        <span>{{ row.kind }} [{{ row.region }}]</span>
      </v-tooltip>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdBy']">
      {{ row.createdBy }}
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdAt']">
      <v-tooltip top>
        <div slot="activator">
          <time-ago :date-time="row.creationTimestamp"></time-ago>
        </div>
        {{ createdAt }}
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['purpose']">
      <purpose-tag :purpose="row.purpose"></purpose-tag>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['lastOperation']">
      <shoot-status :operation="row.lastOperation" :lastError="row.lastError" :popperKey="row.name" :isHibernated="row.isHibernated"></shoot-status>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['k8sVersion']">
      <v-tooltip top>
        <v-btn slot="activator" class="update_btn" small round
          :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }"
          :outline="!k8sPatchAvailable"
          :dark="k8sPatchAvailable"
          color="cyan darken-2">
            <v-icon small v-if="row.availableK8sUpdates">arrow_drop_up</v-icon>
            {{row.k8sVersion}}
        </v-btn>
        <span v-if="k8sPatchAvailable">Kubernetes patch available</span>
        <span v-else-if="row.availableK8sUpdates">Kubernetes update available</span>
        <span v-else>Kubernetes version up to date</span>
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['readiness']">
      <template v-for="tag in row.tags">
        <status-tag :tag="tag" :popper-key="`${row.name}_${tag.text}`"></status-tag>
      </template>
    </td>
    <td class="nowrap" v-if="this.headerVisible['journal']">
      <v-tooltip top>
        <div slot="activator">
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
            <time-ago :date-time="row.lastUpdatedJournalTimestamp"></time-ago>
          </router-link>
        </div>
        {{ lastUpdatedJournal }}
      </v-tooltip>
    </td>
    <td class="action-button-group text-xs-right" v-if="this.headerVisible['actions']">
      <div class="hidden-md-and-down">
        <v-tooltip top>
          <v-btn small icon class="green--text" slot="activator" :disabled="isDashboardDialogDisabled" @click="showDialog('dashboard')">
            <v-icon>dashboard</v-icon>
          </v-btn>
          <span>Open Dashboard</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="blue--text" slot="activator" :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig')">
            <v-icon>settings</v-icon>
          </v-btn>
          <span>Show Kubeconfig</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="red--text" slot="activator" :disabled="isDeleteDialogDisabled" @click="showDialog('delete')">
            <v-icon>delete</v-icon>
          </v-btn>
          <span>Delete Cluster</span>
        </v-tooltip>
      </div>
      <div class="hidden-lg-and-up">
        <v-menu left origin="center center" transition="scale-transition">
          <v-btn icon slot="activator">
            <v-icon>more_vert</v-icon>
          </v-btn>
          <v-list>
            <v-list-tile :disabled="isDashboardDialogDisabled" @click="showDialog('dashboard', isDashboardDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="green--text">dashboard</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Open Dashboard</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig', isKubeconfigDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="blue--text">settings</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Show Kubeconfig</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isDeleteDialogDisabled" @click="showDialog('delete', isDeleteDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="red--text">delete</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Delete Cluster</v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </div>
    </td>
  </tr>
</template>

<script>
  import { mapGetters } from 'vuex'
  import InfraIcon from '@/components/InfrastructureIcon'
  import ShootStatus from '@/components/ShootStatus'
  import StatusTag from '@/components/StatusTag'
  import PurposeTag from '@/components/PurposeTag'
  import TimeAgo from '@/components/TimeAgo'
  import forEach from 'lodash/forEach'
  import replace from 'lodash/replace'
  import get from 'lodash/get'
  import includes from 'lodash/includes'
  import { getTimestampFormatted, getCloudProviderKind, availableK8sUpdatesForShoot, getCreatedBy, isHibernated } from '@/utils'

  export default {
    components: {
      InfraIcon,
      StatusTag,
      PurposeTag,
      ShootStatus,
      TimeAgo
    },
    props: {
      shootItem: {
        type: Object,
        required: true
      },
      visibleHeaders: {
        type: Array,
        required: true
      }
    },
    computed: {
      ...mapGetters([
        'kubernetesVersions',
        'lastUpdatedJournalByNameAndNamespace'
      ]),
      row () {
        const spec = this.shootItem.spec
        const metadata = this.shootItem.metadata
        const status = this.shootItem.status
        const info = this.shootItem.info
        const kind = getCloudProviderKind(spec.cloud)
        return {
          name: metadata.name,
          namespace: metadata.namespace,
          createdBy: getCreatedBy(metadata),
          creationTimestamp: metadata.creationTimestamp,
          annotations: metadata.annotations,
          deletionTimestamp: metadata.deletionTimestamp,
          lastOperation: get(status, 'lastOperation', {}),
          lastError: get(status, 'lastError'),
          tags: this.mapConditionsToStatusTags(get(status, 'conditions', {})),
          kind,
          region: get(spec, 'cloud.region'),
          isHibernated: isHibernated(spec),
          info,
          availableK8sUpdates: availableK8sUpdatesForShoot(spec),
          k8sVersion: get(spec, 'kubernetes.version'),
          // eslint-disable-next-line
          purpose:get(metadata, ['annotations', 'garden.sapcloud.io/purpose']),
          lastUpdatedJournalTimestamp: this.lastUpdatedJournalByNameAndNamespace(this.shootItem.metadata)
        }
      },
      headerVisible () {
        const headerVisible = {}
        forEach(this.visibleHeaders, (header) => {
          headerVisible[header.value] = true
        })
        return headerVisible
      },
      projectName () {
        return replace(this.row.namespace, /^garden-/, '')
      },
      createdAt () {
        return getTimestampFormatted(this.row.creationTimestamp)
      },
      lastUpdatedJournal () {
        return getTimestampFormatted(this.row.lastUpdatedJournalTimestamp)
      },
      k8sPatchAvailable () {
        if (get(this.row, 'availableK8sUpdates.patch')) {
          return true
        }
        return false
      },
      isInfoAvailable () {
        const lastOperation = this.row.lastOperation || {}
        // operator not yet updated shoot resource
        if (lastOperation.type === undefined || lastOperation.state === undefined) {
          return false
        }
        return !this.isCreateOrDeleteInProcess
      },
      isCreateOrDeleteInProcess () {
        const lastOperation = this.row.lastOperation || {}
        // create or delete in process
        if (includes(['Create', 'Delete'], lastOperation.type) && lastOperation.state === 'Processing') {
          return true
        }
        return false
      },
      isDeleteDialogDisabled () {
        // eslint-disable-next-line
        const confirmation = get(this.row, ['annotations', 'confirmation.garden.sapcloud.io/deletionTimestamp'])
        return !!this.row.deletionTimestamp && this.row.deletionTimestamp === confirmation
      },
      isDashboardDialogDisabled () {
        const itemInfo = this.row.info || {}

        if (itemInfo.dashboardUrl) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable
      },
      isKubeconfigDialogDisabled () {
        const itemInfo = this.row.info || {}

        if (itemInfo.kubeconfig) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable
      }
    },
    methods: {
      showDialog: function (action, disabled = false) {
        if (disabled !== true) {
          // disabled check required as v-list-tile disabled=true does not prevent click action
          const shootItem = this.shootItem
          this.$emit('showDialog', { action, shootItem })
        }
      },
      mapConditionsToStatusTags (conditions) {
        if (!conditions || !conditions.length) {
          return []
        }
        return conditions
          .filter(condition => !!condition.lastTransitionTime)
          .map(({lastTransitionTime, message, status, type}) => {
            const id = type
            let text = replace(type, /([a-z])([A-Z])/g, '$1 $2')
            switch (type) {
              case 'ControlPlaneHealthy':
                text = 'Control Plane'
                break
              case 'SystemComponentsHealthy':
                text = 'System Components'
                break
              case 'EveryNodeReady':
                text = 'Nodes'
                break
            }
            return {id, text, message, lastTransitionTime, status}
          })
      }
    }
  }
</script>
<style lang="styl" scoped>

.action-button-group {
  white-space: nowrap;

  button[type=button] {
    margin: 0 4px;
  }

}

.nowrap {
  white-space: nowrap;
}

.update_btn {
  min-width: 0px;
}

.update_btn >>> i {
  margin-left: -8px;
}
</style>