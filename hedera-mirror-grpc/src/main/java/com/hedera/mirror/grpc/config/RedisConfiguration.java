package com.hedera.mirror.grpc.config;

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

import com.fasterxml.jackson.databind.ObjectMapper;
import io.lettuce.core.metrics.MicrometerCommandLatencyRecorder;
import io.lettuce.core.metrics.MicrometerOptions;
import io.micrometer.core.instrument.MeterRegistry;
import org.msgpack.jackson.dataformat.MessagePackFactory;
import org.springframework.boot.actuate.autoconfigure.metrics.CompositeMeterRegistryAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.metrics.MetricsAutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.AutoConfigureBefore;
import org.springframework.boot.autoconfigure.data.redis.ClientResourcesBuilderCustomizer;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisOperations;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.hedera.mirror.grpc.domain.StreamMessage;

@AutoConfigureBefore(RedisAutoConfiguration.class)
@AutoConfigureAfter({MetricsAutoConfiguration.class, CompositeMeterRegistryAutoConfiguration.class})
@Configuration
class RedisConfiguration {

    // Override default auto-configuration to disable histogram metrics
    @Bean
    ClientResourcesBuilderCustomizer lettuceMetrics(MeterRegistry meterRegistry) {
        MicrometerOptions options = MicrometerOptions.builder().histogram(false).build();
        return client -> client.commandLatencyRecorder(new MicrometerCommandLatencyRecorder(meterRegistry, options));
    }

    @Bean
    RedisSerializer<?> redisSerializer() {
        ObjectMapper objectMapper = new ObjectMapper(new MessagePackFactory());
        Jackson2JsonRedisSerializer jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer(StreamMessage.class);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);
        return jackson2JsonRedisSerializer;
    }

    @Bean
    ReactiveRedisOperations<String, StreamMessage> reactiveRedisOperations(ReactiveRedisConnectionFactory connectionFactory) {
        RedisSerializationContext<String, StreamMessage> serializationContext = RedisSerializationContext
                .newSerializationContext()
                .key((RedisSerializer) StringRedisSerializer.UTF_8)
                .value(redisSerializer())
                .hashKey(StringRedisSerializer.UTF_8)
                .hashValue(redisSerializer())
                .build();
        return new ReactiveRedisTemplate<>(connectionFactory, serializationContext);
    }
}
