package com.hedera.mirror.importer.repository.upsert;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.hedera.mirror.common.domain.entity.Entity;
import com.hedera.mirror.common.domain.token.TokenAccount;
import com.hedera.mirror.importer.IntegrationTest;

@RequiredArgsConstructor(onConstructor = @__(@Autowired))
class UpsertQueryGeneratorFactoryTest extends IntegrationTest {

    private final UpsertQueryGeneratorFactory factory;
    private final TokenAccountUpsertQueryGenerator customUpsertQueryGenerator;

    @Test
    void unsupportedClass() {
        assertThatThrownBy(() -> factory.get(Object.class))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("not annotated with @Upsertable");
    }

    @Test
    void getExistingGenerator() {
        assertThat(factory.get(TokenAccount.class)).isEqualTo(customUpsertQueryGenerator);
    }

    @Test
    void getGenericGenerator() {
        assertThat(factory.get(Entity.class)).isInstanceOf(GenericUpsertQueryGenerator.class);
    }
}
