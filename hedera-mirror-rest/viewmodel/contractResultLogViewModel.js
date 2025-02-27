/*-
 * ‌
 * Hedera Mirror Node
 * ​
 * Copyright (C) 2019 - 2022 Hedera Hashgraph, LLC
 * ​
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ‍
 */

import EntityId from '../entityId';
import {filterKeys} from '../constants';
import {toHexString} from '../utils';

/**
 * Contract results log view model
 */
class ContractResultLogViewModel {
  /**
   * Constructs contractResultLogs view model
   *
   * @param {ContractLog} contractLog
   */
  constructor(contractLog, extended = true) {
    const contractId = EntityId.parse(contractLog.contractId, {paramName: filterKeys.CONTRACTID});
    Object.assign(this, {
      address: contractLog.evmAddress ? toHexString(contractLog.evmAddress, true) : contractId.toEvmAddress(),
      bloom: toHexString(contractLog.bloom, true),
      contract_id: contractId.toString(),
      data: toHexString(contractLog.data, true),
      index: contractLog.index,
      topics: this._formatTopics([contractLog.topic0, contractLog.topic1, contractLog.topic2, contractLog.topic3]),
    });
  }

  _formatTopics(topics) {
    return topics.filter((topic) => topic !== null).map((topic) => toHexString(topic, true, 64));
  }
}

export default ContractResultLogViewModel;
