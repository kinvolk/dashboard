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
  <v-dialog v-model="visible" persistent max-width="500">
    <v-card>
      <v-card-title class="red darken-2 grey--text text--lighten-4">
        <div class="headline">
          <slot name="caption">
            Confirm Dialog
          </slot>
        </div>
      </v-card-title>
      <v-card-text class="subheadingfont">
        <slot name="message">
          This is a generic dialog template.
        </slot>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native.stop="onAbort">Abort</v-btn>
        <v-btn flat @click.native.stop="onConfirm" class="blue--text">Confirm</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    name: 'ConfirmDialog',
    props: {
      value: {
        type: Boolean,
        required: true
      }
    },
    computed: {
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      }
    },
    methods: {
      close (event) {
        this.visible = false
        this.$emit(event)
      },
      onAbort () {
        this.close('aborted')
      },
      onConfirm () {
        this.close('confirmed')
      }
    }
  }
</script>
