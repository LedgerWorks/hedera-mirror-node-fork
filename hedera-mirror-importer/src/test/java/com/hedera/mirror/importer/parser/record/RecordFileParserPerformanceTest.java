package com.hedera.mirror.importer.parser.record;

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

import com.google.common.util.concurrent.Uninterruptibles;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.EnabledIf;

import com.hedera.mirror.common.domain.StreamType;
import com.hedera.mirror.importer.config.IntegrationTestConfiguration;
import com.hedera.mirror.importer.parser.domain.RecordFileBuilder;

@EnabledIf("#{environment.acceptsProfiles('performance')}")
@Import(IntegrationTestConfiguration.class)
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
@SpringBootTest
@Tag("performance")
class RecordFileParserPerformanceTest {

    private final ParserPerformanceProperties performanceProperties;
    private final RecordFileParser recordFileParser;
    private final RecordFileBuilder recordFileBuilder;

    @Test
    void scenarios() {
        long interval = StreamType.RECORD.getFileCloseInterval().toMillis();
        long duration = performanceProperties.getDuration().toMillis();
        long startTime = System.currentTimeMillis();
        long endTime = startTime;
        var recordFile = recordFileBuilder.recordFile();

        performanceProperties.getTransactions().forEach(p -> {
            int count = (int) (p.getTps() * interval / 1000);
            recordFile.recordItems(i -> i.count(count).entities(p.getEntities()).type(p.getType()));
        });

        while (endTime - startTime < duration) {
            recordFileParser.parse(recordFile.build());

            long sleep = interval - (System.currentTimeMillis() - endTime);
            if (sleep > 0) {
                Uninterruptibles.sleepUninterruptibly(sleep, TimeUnit.MILLISECONDS);
            }
            endTime = System.currentTimeMillis();
        }
    }
}
