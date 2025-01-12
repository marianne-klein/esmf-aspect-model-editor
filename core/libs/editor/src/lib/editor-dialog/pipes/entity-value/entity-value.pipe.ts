/*
 * Copyright (c) 2023 Robert Bosch Manufacturing Solutions GmbH
 *
 * See the AUTHORS file(s) distributed with this work for
 * additional information regarding authorship.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * SPDX-License-Identifier: MPL-2.0
 */

import {Pipe, PipeTransform} from '@angular/core';
import {DefaultEntityValue} from '@ame/meta-model';

@Pipe({
  name: 'entityValue',
})
export class EntityValuePipe implements PipeTransform {
  transform(value: DefaultEntityValue[], search: string): DefaultEntityValue[] {
    if (!value || value.length === 0) {
      return null;
    }
    if (!search) {
      return value;
    }
    return value.filter(val => val.name.includes(search));
  }
}
