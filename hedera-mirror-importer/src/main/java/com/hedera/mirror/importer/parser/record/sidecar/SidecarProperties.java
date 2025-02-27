package com.hedera.mirror.importer.parser.record.sidecar;

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

import java.util.Collections;
import java.util.Set;
import javax.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import com.hedera.services.stream.proto.SidecarType;

@Data
@ConfigurationProperties("hedera.mirror.importer.parser.record.sidecar")
public class SidecarProperties {

    private boolean enabled = false;

    private boolean persistBytes = false;

    @NotNull
    private Set<SidecarType> types = Collections.emptySet();
}
