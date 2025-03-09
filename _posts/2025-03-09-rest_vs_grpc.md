---
layout: post
title:  "REST vs gRPC 성능 비교: 정말 gRPC가 좋을까?"
author: jyukki
categories: [ REST, gRPC, TEST, Kotlin ]
---


> gRPC는 REST보다 빠르다?<br>
> 뭔가 지나가다 들었던 것 같은데 gRPC가 REST보다 성능이 좋다고 했던 것 같다.<br>
> 단순한 API 호출에서 성능 차이가 있을까?<br>
> 뭐.. 테스트 해보면 알겠지 확인해보자.


## 1차 테스트
<hr>
#### REST API 

```kotlin
@RestController
@RequestMapping("/api")
class RestTestController {

    @GetMapping("/hello")
    fun hello(): Mono<Map<String, String>> {
        return Mono.just(mapOf("message" to "Hello from REST"))
    }
}
```


#### gRPC

```proto
syntax = "proto3";

option java_multiple_files = true;
option java_package = "com.example.grpc";

service HelloService {
  rpc SayHello (HelloRequest) returns (HelloResponse);
}

message HelloRequest {
  string name = 1;
}

message HelloResponse {
  string message = 1;
}
```

```kotlin
@GrpcService
class HelloServiceImpl : HelloServiceGrpc.HelloServiceImplBase() {

    override fun sayHello(request: HelloRequest, responseObserver: StreamObserver<HelloResponse>) {
        val response = HelloResponse.newBuilder()
            .setMessage("Hello from gRPC, ${request.name}")
            .build()

        responseObserver.onNext(response)
        responseObserver.onCompleted()
    }
}
```

#### 테스트 코드

```kotlin
class GrpcRestPerformanceTest {

    companion object {
        private lateinit var restClient: WebClient
        private lateinit var grpcStub: HelloServiceGrpc.HelloServiceBlockingStub

        @JvmStatic
        @BeforeAll
        fun setup() {
            restClient = WebClient.create("http://localhost:8080")

            val channel = ManagedChannelBuilder.forAddress("localhost", 9090)
                .usePlaintext()
                .build()

            grpcStub = HelloServiceGrpc.newBlockingStub(channel)
        }
    }

    @Test
    fun testRestVsGrpcPerformance() {
        val restTime = measureTimeMillis {
            repeat(1000) {
                restClient.get()
                    .uri("/api/test")
                    .retrieve()
                    .bodyToMono(String::class.java)
                    .block()
            }
        }

        val grpcTime = measureTimeMillis {
            repeat(1000) {
                grpcStub.sayHello(HelloRequest.newBuilder().setName("test").build())
            }
        }

        println("REST API 실행 시간: ${restTime}ms")
        println("gRPC 실행 시간: ${grpcTime}ms")
    }
}
```

#### 결과
```
REST API 실행 시간: 728ms
gRPC 실행 시간: 493ms
```
*생각보다 별 차이가 안난다?..*

* REST API 에 비해 gRPC 구성이 귀찮았다는 것을 생각해보면 생각보다 차이가 안나보인다
* 47% 정도 더 빠른 것 같긴한데, 의미가 있어보진 않는다. (뭐.. 이정도 차이는 네트워크 차이겠지.. 아닌가? 빠른 것 같기도?)
* 데이터 양이 너무 작아서 잘 안느껴지나? 좀 더 늘려보자


## 2차 테스트 (데이터 추가)
<hr>
#### REST API 

```kotlin
@GetMapping("/hello-big")
fun helloBig(): Mono<Map<String, Any>> {
    return Mono.just(
        mapOf(
            "message" to "Hello from REST",
            "dataList" to List(1000) { "Item $it" } // 1000개 데이터 추가
        )
    )
}
```


#### gRPC

```proto
service HelloService {
  rpc SayHelloBig (HelloRequest) returns (HelloBigResponse);
}

message HelloBigResponse {
  string message = 1;
  repeated string dataList = 2;  // 데이터 추가
}
```

```kotlin
override fun sayHelloBig(request: HelloRequest, responseObserver: StreamObserver<HelloBigResponse>) {
    val response = HelloBigResponse.newBuilder()
        .setMessage("Hello from gRPC, ${request.name}")
        .addAllDataList(List(1000) { "Item $it" }) // 1000개 데이터 추가
        .build()

    responseObserver.onNext(response)
    responseObserver.onCompleted()
}
```

#### 테스트 코드

```kotlin
@Test
fun testRestVsGrpcPerformance2() {
    val restTime = measureTimeMillis {
        repeat(1000) {
            restClient.get()
                .uri("/api/hello-big")
                .retrieve()
                .bodyToMono(String::class.java)
                .block()
        }
    }

    val grpcTime = measureTimeMillis {
        repeat(1000) {
            grpcStub.sayHelloBig(HelloRequest.newBuilder().setName("test").build())
        }
    }

    println("REST API 실행 시간: ${restTime}ms")
    println("gRPC 실행 시간: ${grpcTime}ms")
}
```

#### 결과
```
REST API 실행 시간: 749ms
gRPC 실행 시간: 586ms
```

*???? 뭐지 왜 속도가 똑같지?... 아니 애초에 gRPC 만 속도가 늘었네, 이유가 뭐지..*

* 27% 더 빠르긴 한데, 이전보다 속도 차이가 줄었다.
* 간단한 String 이라지만 리스트 1000개를 보낼일이 거의 없다는 거 생각하면, 속도 차이는 없다고 봐도 될지도?... (그냥 Streaming 용 인가??...)
* 으음... 데이터가 늘었을 때, 속도차이가 줄었다.. 음.. 직렬화 비용이 gRPC 가 더 비싼가? cost 를 비교해볼까?..




## 추가: 리소스는 누가 더 먹을까?

<hr>

### 데이터 크기 비교
* 속도가 빠른 이유가 보내는 데이터가 더 적기 때문이지 않을까?

#### 테스트 코드

```kotlin
@Test
fun testApiNetworkUsage() {
    val requestJson = objectMapper.writeValueAsBytes(mapOf("name" to "test"))
    val restRequestSize = requestJson.size

    val restResponseSize = measureTimeMillis {
        val response = restClient.get()
            .uri("/api/hello-big")
            .retrieve()
            .bodyToMono(String::class.java)
            .block()
        response?.toByteArray()?.size ?: 0
    }

    val grpcRequestProto = HelloRequest.newBuilder().setName("test").build().toByteArray()
    val grpcRequestSize = grpcRequestProto.size

    val grpcResponseSize = measureTimeMillis {
        val response = grpcStub.sayHelloBig(HelloRequest.newBuilder().setName("test").build())
        response.toByteArray().size
    }

    println("REST 요청 크기: ${restRequestSize} bytes")
    println("REST 응답 크기: ${restResponseSize} bytes")

    println("gRPC 요청 크기: ${grpcRequestSize} bytes")
    println("gRPC 응답 크기: ${grpcResponseSize} bytes")
}
```

#### 결과
```
REST 요청 크기: 15 bytes
REST 응답 크기: 135 bytes
gRPC 요청 크기: 6 bytes
gRPC 응답 크기: 73 bytes
```

* 오!! 실제로 데이터 크기가 작다
* 절반 정도로 작은 것은 좀 유의미해 보인다. 
* 데이터 크기가 적은 만큼 빠르다 라고 보는게 맞을 것 같다.
* gRPC 는 작은 크기로 직렬화 + 데이터 압축으로 네트워크 트래픽이 적다는 것 같다.


### CPU 사용량 테스트

#### 테스트 코드

```kotlin
private fun getProcessCpuLoad(): Double {
    val osBean = ManagementFactory.getOperatingSystemMXBean() as com.sun.management.OperatingSystemMXBean
    return osBean.processCpuLoad * 100
}

@Test
fun testRestApiCpuUsage() {
    val cpuBefore = getProcessCpuLoad()
    val timeTaken = measureTimeMillis {
        repeat(1000) {
            restClient.get()
                .uri("/api/hello-big")
                .retrieve()
                .bodyToMono(String::class.java)
                .block()
        }
    }
    val cpuAfter = getProcessCpuLoad()

    println("REST API 실행 시간: ${timeTaken}ms, CPU 사용량: ${cpuBefore}% → ${cpuAfter}%")
}

@Test
fun testGrpcCpuUsage() {
    val cpuBefore = getProcessCpuLoad()
    val timeTaken = measureTimeMillis {
        repeat(1000) {
            grpcStub.sayHelloBig(HelloRequest.newBuilder().setName("test").build())
        }
    }
    val cpuAfter = getProcessCpuLoad()

    println("gRPC 실행 시간: ${timeTaken}ms, CPU 사용량: ${cpuBefore}% → ${cpuAfter}%")
}
```


#### 결과
```
REST API 실행 시간: 565ms, CPU 사용량: 0.0% → 13.67082100502329%
gRPC 실행 시간: 463ms, CPU 사용량: 0.0% → 17.609519673425176%
```

* 대략 30% 정도 CPU를 더 쓰는 것 같다.
* 왜일까?... 위에 데이터 크기가 줄어드는 것과 연관이 있을까?
* 데이터 직렬화 + 압축에 CPU를 좀 더 쓰는 것 같기도 하다?



## 결론

| 항목        | REST | gRPC | 차이점 |
|------------|---------------|---------------|-------|
| **속도** | 749ms | 586ms | gRPC가 30% 더 빠름 |
| **요청 데이터 크기** | 15 bytes | 6 bytes | gRPC가 2.5배 더 작음 |
| **응답 데이터 크기** | 135 bytes | 73 bytes | gRPC가 2배 더 작음 |
| **CPU 사용량** | 13.6% | 17.6% | gRPC가 CPU를 30% 더 많이 사용함 |

<br>
### 요약
* HTTP/2 + Protobuf + 바이너리 직렬화로 gRPC 가 속도도 빠르고, 데이터 크기도 적다.
* 그로인한 오버헤드로 CPU 사용량이 더 많다.
* CPU 리소스를 고려하지않아도 된다면, 서버 사이의 통신은 gRPC도 생각보다 고려해볼만 하다.