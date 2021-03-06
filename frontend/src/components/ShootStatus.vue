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
  <g-popper :title="popperTitle" :time="operation.lastUpdateTime" toolbarColor="cyan darken-2" :popperKey="popperKeyWithType">
    <div slot="popperRef">
      <v-tooltip top>
        <template slot="activator">
          <v-progress-circular v-if="showProgress && !isError" class="cursor-pointer progress-circular" :size="27" :width="3" :value="operation.progress" color="cyan darken-2" :rotate="-90">{{operation.progress}}</v-progress-circular>
          <v-progress-circular v-else-if="showProgress" class="cursor-pointer progress-circular-error" :size="27" :width="3" :value="operation.progress" color="error" :rotate="-90">
            <v-icon v-if="isUserError" class="cursor-pointer progress-icon" color="error">mdi-account-alert</v-icon>
            <template v-else>
              !
            </template>
          </v-progress-circular>
          <v-icon v-else-if="isUserError" class="cursor-pointer status-icon" color="error">mdi-account-alert</v-icon>
          <v-icon v-else-if="isError" class="cursor-pointer status-icon" color="error">mdi-alert-outline</v-icon>
          <v-progress-circular v-else-if="operationState==='Pending'" class="cursor-pointer" :size="27" :width="3" indeterminate color="cyan darken-2"></v-progress-circular>
          <v-icon v-else-if="isHibernated" class="cursor-pointer status-icon" color="cyan darken-2">mdi-sleep</v-icon>
          <v-icon v-else class="cursor-pointer status-icon" color="success">mdi-check-circle-outline</v-icon>
        </template>
        <span>{{ tooltipText }}</span>
      </v-tooltip>
    </div>
    <template slot="content-after">
      <pre v-if="!!popperMessage" class="alert-message">{{ popperMessage }}</pre>
      <template v-if="isError">
        <v-divider class="my-2"></v-divider>
        <h4 class="error--text text-xs-left">Last Error</h4>
        <template v-for="errorCodeDescription in errorCodeDescriptions">
          <h3 class="error--text text-xs-left">{{errorCodeDescription}}</h3>
        </template>
        <pre class="alert-message error--text" color="error">{{ lastErrorDescription }}</pre>
      </template>
  </template>>
  </g-popper>
</template>

<script>
  import GPopper from '@/components/GPopper'
  import get from 'lodash/get'
  import map from 'lodash/map'
  import join from 'lodash/join'
  import { isUserError } from '@/utils'

  const errorCodes = {
    'ERR_INFRA_UNAUTHORIZED': {
      shortDescription: 'Invalid Credentials',
      description: 'Invalid cloud provider credentials.'
    },
    'ERR_INFRA_INSUFFICIENT_PRIVILEGES': {
      shortDescription: 'Insufficient Privileges',
      description: 'Cloud provider credentials have insufficient privileges.'
    },
    'ERR_INFRA_QUOTA_EXCEEDED': {
      shortDescription: 'Quota Exceeded',
      description: 'Cloud provider quota exceeded. Please request limit increases.'
    },
    'ERR_INFRA_DEPENDENCIES': {
      shortDescription: 'Infrastructure Dependencies',
      description: 'Infrastructure operation failed as unmanaged resources exist in your cloud provider account. Please delete all manually created resources related to this Shoot.'
    }
  }

  export default {
    components: {
      GPopper
    },
    props: {
      operation: {
        type: Object,
        required: true
      },
      lastError: {
        type: Object,
        required: false
      },
      popperKey: {
        type: String,
        required: true
      },
      isHibernated: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      showProgress () {
        return this.operation.state === 'Processing'
      },
      isError () {
        return this.operation.state === 'Failed' || this.operation.state === 'Error' || this.lastErrorDescription
      },
      isUserError () {
        return isUserError(this.errorCodes)
      },
      lastErrorDescription () {
        return get(this.lastError, 'description')
      },
      errorCodes () {
        return get(this.lastError, 'codes', [])
      },
      errorCodeDescriptions () {
        return map(this.errorCodes, code => get(errorCodes, `${code}.description`, code))
      },
      errorCodeShortDescriptions () {
        return map(this.errorCodes, code => get(errorCodes, `${code}.shortDescription`, code))
      },
      popperKeyWithType () {
        return `shootStatus_${this.popperKey}`
      },
      popperTitle () {
        let popperTitle = ''
        if (this.isHibernated) {
          popperTitle = popperTitle.concat('Hibernated; ')
        }
        return popperTitle.concat(`${this.operationType} ${this.operationState}`)
      },
      tooltipText () {
        let tooltipText = this.popperTitle
        if (this.showProgress) {
          tooltipText = tooltipText.concat(` (${this.operation.progress}%)`)
        }
        if (this.isUserError) {
          tooltipText = tooltipText.concat(`; ${join(this.errorCodeShortDescriptions, ', ')}`)
        }
        return tooltipText
      },
      popperMessage () {
        let message = this.operation.description
        message = message || 'No description'
        if (message === this.lastErrorDescription) {
          return undefined
        }
        return message
      },
      operationType () {
        return this.operation.type || 'Create'
      },
      operationState () {
        return this.operation.state || 'Pending'
      }
    }
  }
</script>

<style lang="styl" scoped>

  /* overwrite message class from g-popper child component */
  >>> .message {
    max-height: 800px;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .progress-circular {
    font-size: 12px;
  }

  .progress-icon {
    font-size: 1.1em;
    padding-left: 2px;
    padding-bottom: 3px;
  }

  .progress-circular-error {
    font-size: 15px;
    font-weight: bold;
  }

  .status-icon {
    font-size: 2em;
  }

  .alert-message {
    text-align: left;
    min-width: 250px;
    max-width: 800px;
    max-height: 300px;
    white-space: pre-wrap;
    overflow-y: auto;
  }

</style>
