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
  <v-layout row class="azureWorkerRow">
    <v-flex xs1 class="mt-1"><v-avatar class="cyan"><v-icon class="white--text">mdi-server</v-icon></v-avatar></v-flex>
    <v-flex xs2 class="ml-2">
      <v-text-field
        color="cyan"
        :error-messages="getErrorMessages('worker.name')"
        @input="$v.worker.name.$touch()"
        @blur="$v.worker.name.$touch()"
        v-model="worker.name"
        label="Group Name">
      </v-text-field>
    </v-flex>

    <v-flex xs2  class="ml-3">
      <machine-type
      :machineTypes="machineTypes"
      :worker="worker">
      </machine-type>
    </v-flex>

    <v-flex xs2  class="ml-5">
      <volume-type
      :volumeTypes="volumeTypes"
      :worker="worker">
      </volume-type>
    </v-flex>

    <v-flex xs1  class="ml-3">
      <size-input
        min="1"
        color="cyan"
        :error-messages="getErrorMessages('worker.volumeSize')"
        @input="$v.worker.volumeSize.$touch()"
        @blur="$v.worker.volumeSize.$touch()"
        label="Volume Size"
        v-model="worker.volumeSize"
      ></size-input>
    </v-flex>

    <v-flex xs1 class="ml-5">
      <v-text-field
        min="1"
        color="cyan"
        :error-messages="getErrorMessages('worker.autoScalerMax')"
        @input="$v.worker.autoScalerMax.$touch()"
        @blur="$v.worker.autoScalerMax.$touch()"
        type="number"
        v-model="innerMax"
        label="Node Count"
      ></v-text-field>
    </v-flex>


    <v-flex xs1 class="ml-2 mt-2">
      <slot name="action">
      </slot>
    </v-flex>

  </v-layout>
</template>

<script>
  import { mapGetters } from 'vuex'
  import SizeInput from '@/components/VolumeSizeInput'
  import MachineType from '@/components/MachineType'
  import VolumeType from '@/components/VolumeType'
  import { required, minValue } from 'vuelidate/lib/validators'
  import { getValidationErrors } from '@/utils'
  import { uniqueWorkerName, minVolumeSize } from '@/utils/validators'

  const validationErrors = {
    worker: {
      name: {
        required: 'You can\'t leave this empty.',
        uniqueWorkerName: 'Name is taken. Try another.'
      },
      volumeSize: {
        minVolumeSize: 'Invalid volume size'
      },
      autoScalerMax: {
        minValue: 'Invalid node count'
      }
    }
  }

  const validations = {
    worker: {
      name: {
        required,
        uniqueWorkerName
      },
      volumeSize: {
        minVolumeSize: minVolumeSize(1)
      },
      autoScalerMax: {
        minValue: minValue(1)
      }
    }
  }

  export default {
    components: {
      SizeInput,
      MachineType,
      VolumeType
    },
    props: {
      worker: {
        type: Object,
        required: true
      },
      workers: {
        type: Array,
        required: true
      },
      cloudProfileName: {
        type: String
      }
    },
    validations,
    data () {
      return {
        validationErrors
      }
    },
    computed: {
      ...mapGetters([
        'machineTypesByCloudProfileName',
        'volumeTypesByCloudProfileName'
      ]),

      machineTypes () {
        return this.machineTypesByCloudProfileName(this.cloudProfileName)
      },
      volumeTypes () {
        return this.volumeTypesByCloudProfileName(this.cloudProfileName)
      },

      innerMax: {
        get: function () {
          return Math.max(1, this.worker.autoScalerMax)
        },
        set: function (value) {
          this.worker.autoScalerMax = Math.max(1, parseInt(value))
          // min/max must be the same in AZURE
          this.worker.autoScalerMin = this.worker.autoScalerMax
        }
      }
    },

    methods: {
      getErrorMessages (field) {
        return getValidationErrors(this, field)
      }
    }
  }
</script>
