package com.hedera.mirror.common.domain.contract;

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

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import com.hedera.mirror.common.converter.FileIdConverter;
import com.hedera.mirror.common.domain.entity.EntityId;

@Data
@Entity
@NoArgsConstructor
@SuperBuilder
public class Contract {

    @Column(updatable = false)
    @Convert(converter = FileIdConverter.class)
    private EntityId fileId;

    @Id
    private Long id;

    @Column(updatable = false)
    @ToString.Exclude
    private byte[] initcode;

    @Column(updatable = false)
    @ToString.Exclude
    private byte[] runtimeBytecode;
}
