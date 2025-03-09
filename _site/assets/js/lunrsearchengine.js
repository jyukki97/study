
var documents = [{
    "id": 0,
    "url": "http://localhost:4000/study/404.html",
    "title": "404",
    "body": "404 Page does not exist!Please use the search bar at the top or visit our homepage! "
    }, {
    "id": 1,
    "url": "http://localhost:4000/study/about",
    "title": "About",
    "body": "안녕하세요!!: 이 블로그는 제가 학습한 내용을 정리하는 공간입니다.  (아마 다른 것도 올릴 것 같긴 합니다. . ) 재미있는 주제가 생기면 하나씩 올려보려고 합니다 ㅎㅎ 잘 부탁 드립니다! 소개:  이름: 박철영 (jyukki) 경력: 4년 차 백엔드 개발자 (프론트도 가아끔 하긴 합니다. . )연락처 &amp; SNS:  GitHub: github. com/jyukki97 Email: jyukki97@gmail. com이전 블로그:  https://jyukki97. github. io https://velog. io/@jyukki97/posts https://jyukki. tistory. com/"
    }, {
    "id": 2,
    "url": "http://localhost:4000/study/categories",
    "title": "Categories",
    "body": ""
    }, {
    "id": 3,
    "url": "http://localhost:4000/study/",
    "title": "Home",
    "body": "      Featured:                           All Stories:                                                             REST vs gRPC 성능 비교: 정말 gRPC가 좋을까?              :        gRPC는 REST보다 빠르다?뭔가 지나가다 들었던 것 같은데 gRPC가 REST보다 성능이 좋다고 했던 것 같다. 단순한 API 호출에서 성능 차이가 있을까?뭐. . 테스트 해보면 알겠지 확인해보자. :                                                                               jyukki                09 Mar 2025                                                                                            새로운 시작              :       블로그를 새로 만들었습니다. :                                                                               jyukki                09 Mar 2025                                            "
    }, {
    "id": 4,
    "url": "http://localhost:4000/study/robots.txt",
    "title": "",
    "body": "      Sitemap: {{ “sitemap. xml”   absolute_url }}   "
    }, {
    "id": 5,
    "url": "http://localhost:4000/study/rest_vs_grpc/",
    "title": "REST vs gRPC 성능 비교: 정말 gRPC가 좋을까?",
    "body": "2025/03/09 -  gRPC는 REST보다 빠르다?뭔가 지나가다 들었던 것 같은데 gRPC가 REST보다 성능이 좋다고 했던 것 같다. 단순한 API 호출에서 성능 차이가 있을까?뭐. . 테스트 해보면 알겠지 확인해보자. 1차 테스트: REST API: 123456789@RestController@RequestMapping( /api )class RestTestController {  @GetMapping( /hello )  fun hello(): Mono&lt;Map&lt;String, String&gt;&gt; {    return Mono. just(mapOf( message  to  Hello from REST ))  }}gRPC: 12345678910111213141516syntax =  proto3 ;option java_multiple_files = true;option java_package =  com. example. grpc ;service HelloService { rpc SayHello (HelloRequest) returns (HelloResponse);}message HelloRequest { string name = 1;}message HelloResponse { string message = 1;}123456789101112@GrpcServiceclass HelloServiceImpl : HelloServiceGrpc. HelloServiceImplBase() {  override fun sayHello(request: HelloRequest, responseObserver: StreamObserver&lt;HelloResponse&gt;) {    val response = HelloResponse. newBuilder()      . setMessage( Hello from gRPC, ${request. name} )      . build()    responseObserver. onNext(response)    responseObserver. onCompleted()  }}테스트 코드: 1234567891011121314151617181920212223242526272829303132333435363738394041class GrpcRestPerformanceTest {  companion object {    private lateinit var restClient: WebClient    private lateinit var grpcStub: HelloServiceGrpc. HelloServiceBlockingStub    @JvmStatic    @BeforeAll    fun setup() {      restClient = WebClient. create( http://localhost:8080 )      val channel = ManagedChannelBuilder. forAddress( localhost , 9090)        . usePlaintext()        . build()      grpcStub = HelloServiceGrpc. newBlockingStub(channel)    }  }  @Test  fun testRestVsGrpcPerformance() {    val restTime = measureTimeMillis {      repeat(1000) {        restClient. get()          . uri( /api/test )          . retrieve()          . bodyToMono(String::class. java)          . block()      }    }    val grpcTime = measureTimeMillis {      repeat(1000) {        grpcStub. sayHello(HelloRequest. newBuilder(). setName( test ). build())      }    }    println( REST API 실행 시간: ${restTime}ms )    println( gRPC 실행 시간: ${grpcTime}ms )  }}결과: 12REST API 실행 시간: 728msgRPC 실행 시간: 493ms생각보다 별 차이가 안난다?. .  REST API 에 비해 gRPC 구성이 귀찮았다는 것을 생각해보면 생각보다 차이가 안나보인다 47% 정도 더 빠른 것 같긴한데, 의미가 있어보진 않는다. (뭐. . 이정도 차이는 네트워크 차이겠지. . 아닌가? 빠른 것 같기도?) 데이터 양이 너무 작아서 잘 안느껴지나? 좀 더 늘려보자2차 테스트 (데이터 추가): REST API: 123456789@GetMapping( /hello-big )fun helloBig(): Mono&lt;Map&lt;String, Any&gt;&gt; {  return Mono. just(    mapOf(       message  to  Hello from REST ,       dataList  to List(1000) {  Item $it  } // 1000개 데이터 추가    )  )}gRPC: 12345678service HelloService { rpc SayHelloBig (HelloRequest) returns (HelloBigResponse);}message HelloBigResponse { string message = 1; repeated string dataList = 2; // 데이터 추가}123456789override fun sayHelloBig(request: HelloRequest, responseObserver: StreamObserver&lt;HelloBigResponse&gt;) {  val response = HelloBigResponse. newBuilder()    . setMessage( Hello from gRPC, ${request. name} )    . addAllDataList(List(1000) {  Item $it  }) // 1000개 데이터 추가    . build()  responseObserver. onNext(response)  responseObserver. onCompleted()}테스트 코드: 123456789101112131415161718192021@Testfun testRestVsGrpcPerformance2() {  val restTime = measureTimeMillis {    repeat(1000) {      restClient. get()        . uri( /api/hello-big )        . retrieve()        . bodyToMono(String::class. java)        . block()    }  }  val grpcTime = measureTimeMillis {    repeat(1000) {      grpcStub. sayHelloBig(HelloRequest. newBuilder(). setName( test ). build())    }  }  println( REST API 실행 시간: ${restTime}ms )  println( gRPC 실행 시간: ${grpcTime}ms )}결과: 12REST API 실행 시간: 749msgRPC 실행 시간: 586ms???? 뭐지 왜 속도가 똑같지?… 아니 애초에 gRPC 만 속도가 늘었네, 이유가 뭐지. .  27% 더 빠르긴 한데, 이전보다 속도 차이가 줄었다.  간단한 String 이라지만 리스트 1000개를 보낼일이 거의 없다는 거 생각하면, 속도 차이는 없다고 봐도 될지도?… (그냥 Streaming 용 인가??…) 으음… 데이터가 늘었을 때, 속도차이가 줄었다. . 음. . 직렬화 비용이 gRPC 가 더 비싼가? cost 를 비교해볼까?. . 추가: 리소스는 누가 더 먹을까?: 데이터 크기 비교:  속도가 빠른 이유가 보내는 데이터가 더 적기 때문이지 않을까?테스트 코드: 12345678910111213141516171819202122232425262728@Testfun testApiNetworkUsage() {  val requestJson = objectMapper. writeValueAsBytes(mapOf( name  to  test ))  val restRequestSize = requestJson. size  val restResponseSize = measureTimeMillis {    val response = restClient. get()      . uri( /api/hello-big )      . retrieve()      . bodyToMono(String::class. java)      . block()    response?. toByteArray()?. size ?: 0  }  val grpcRequestProto = HelloRequest. newBuilder(). setName( test ). build(). toByteArray()  val grpcRequestSize = grpcRequestProto. size  val grpcResponseSize = measureTimeMillis {    val response = grpcStub. sayHelloBig(HelloRequest. newBuilder(). setName( test ). build())    response. toByteArray(). size  }  println( REST 요청 크기: ${restRequestSize} bytes )  println( REST 응답 크기: ${restResponseSize} bytes )  println( gRPC 요청 크기: ${grpcRequestSize} bytes )  println( gRPC 응답 크기: ${grpcResponseSize} bytes )}결과: 1234REST 요청 크기: 15 bytesREST 응답 크기: 135 bytesgRPC 요청 크기: 6 bytesgRPC 응답 크기: 73 bytes 오!! 실제로 데이터 크기가 작다 절반 정도로 작은 것은 좀 유의미해 보인다.  데이터 크기가 적은 만큼 빠르다 라고 보는게 맞을 것 같다.  gRPC 는 작은 크기로 직렬화 + 데이터 압축으로 네트워크 트래픽이 적다는 것 같다. CPU 사용량 테스트: 테스트 코드: 12345678910111213141516171819202122232425262728293031323334private fun getProcessCpuLoad(): Double {  val osBean = ManagementFactory. getOperatingSystemMXBean() as com. sun. management. OperatingSystemMXBean  return osBean. processCpuLoad * 100}@Testfun testRestApiCpuUsage() {  val cpuBefore = getProcessCpuLoad()  val timeTaken = measureTimeMillis {    repeat(1000) {      restClient. get()        . uri( /api/hello-big )        . retrieve()        . bodyToMono(String::class. java)        . block()    }  }  val cpuAfter = getProcessCpuLoad()  println( REST API 실행 시간: ${timeTaken}ms, CPU 사용량: ${cpuBefore}% → ${cpuAfter}% )}@Testfun testGrpcCpuUsage() {  val cpuBefore = getProcessCpuLoad()  val timeTaken = measureTimeMillis {    repeat(1000) {      grpcStub. sayHelloBig(HelloRequest. newBuilder(). setName( test ). build())    }  }  val cpuAfter = getProcessCpuLoad()  println( gRPC 실행 시간: ${timeTaken}ms, CPU 사용량: ${cpuBefore}% → ${cpuAfter}% )}결과: 12REST API 실행 시간: 565ms, CPU 사용량: 0. 0% → 13. 67082100502329%gRPC 실행 시간: 463ms, CPU 사용량: 0. 0% → 17. 609519673425176% 대략 30% 정도 CPU를 더 쓰는 것 같다.  왜일까?… 위에 데이터 크기가 줄어드는 것과 연관이 있을까? 데이터 직렬화 + 압축에 CPU를 좀 더 쓰는 것 같기도 하다?결론:       항목   REST   gRPC   차이점         속도   749ms   586ms   gRPC가 30% 더 빠름       요청 데이터 크기   15 bytes   6 bytes   gRPC가 2. 5배 더 작음       응답 데이터 크기   135 bytes   73 bytes   gRPC가 2배 더 작음       CPU 사용량   13. 6%   17. 6%   gRPC가 CPU를 30% 더 많이 사용함    요약:  HTTP/2 + Protobuf + 바이너리 직렬화로 gRPC 가 속도도 빠르고, 데이터 크기도 적다.  그로인한 오버헤드로 CPU 사용량이 더 많다.  CPU 리소스를 고려하지않아도 된다면, 서버 사이의 통신은 gRPC도 생각보다 고려해볼만 하다. "
    }, {
    "id": 6,
    "url": "http://localhost:4000/study/open/",
    "title": "새로운 시작",
    "body": "2025/03/09 - 블로그를 새로 만들었습니다. 앞으로는 공부하고 있는 것들을 하나하나 정리해보려고 합니다. 잘부탁드립니다. "
    }];

var idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('body')

    documents.forEach(function (doc) {
        this.add(doc)
    }, this)
});
function lunr_search(term) {
    document.getElementById('lunrsearchresults').innerHTML = '<ul></ul>';
    if(term) {
        document.getElementById('lunrsearchresults').innerHTML = "<p>Search results for '" + term + "'</p>" + document.getElementById('lunrsearchresults').innerHTML;
        //put results on the screen.
        var results = idx.search(term);
        if(results.length>0){
            //console.log(idx.search(term));
            //if results
            for (var i = 0; i < results.length; i++) {
                // more statements
                var ref = results[i]['ref'];
                var url = documents[ref]['url'];
                var title = documents[ref]['title'];
                var body = documents[ref]['body'].substring(0,160)+'...';
                document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML = document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML + "<li class='lunrsearchresult'><a href='" + url + "'><span class='title'>" + title + "</span><br /><span class='body'>"+ body +"</span><br /><span class='url'>"+ url +"</span></a></li>";
            }
        } else {
            document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML = "<li class='lunrsearchresult'>No results found...</li>";
        }
    }
    return false;
}

function lunr_search(term) {
    $('#lunrsearchresults').show( 400 );
    $( "body" ).addClass( "modal-open" );
    
    document.getElementById('lunrsearchresults').innerHTML = '<div id="resultsmodal" class="modal fade show d-block"  tabindex="-1" role="dialog" aria-labelledby="resultsmodal"> <div class="modal-dialog shadow-lg" role="document"> <div class="modal-content"> <div class="modal-header" id="modtit"> <button type="button" class="close" id="btnx" data-dismiss="modal" aria-label="Close"> &times; </button> </div> <div class="modal-body"> <ul class="mb-0"> </ul>    </div> <div class="modal-footer"><button id="btnx" type="button" class="btn btn-danger btn-sm" data-dismiss="modal">Close</button></div></div> </div></div>';
    if(term) {
        document.getElementById('modtit').innerHTML = "<h5 class='modal-title'>Search results for '" + term + "'</h5>" + document.getElementById('modtit').innerHTML;
        //put results on the screen.
        var results = idx.search(term);
        if(results.length>0){
            //console.log(idx.search(term));
            //if results
            for (var i = 0; i < results.length; i++) {
                // more statements
                var ref = results[i]['ref'];
                var url = documents[ref]['url'];
                var title = documents[ref]['title'];
                var body = documents[ref]['body'].substring(0,160)+'...';
                document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML = document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML + "<li class='lunrsearchresult'><a href='" + url + "'><span class='title'>" + title + "</span><br /><small><span class='body'>"+ body +"</span><br /><span class='url'>"+ url +"</span></small></a></li>";
            }
        } else {
            document.querySelectorAll('#lunrsearchresults ul')[0].innerHTML = "<li class='lunrsearchresult'>Sorry, no results found. Close & try a different search!</li>";
        }
    }
    return false;
}
    
$(function() {
    $("#lunrsearchresults").on('click', '#btnx', function () {
        $('#lunrsearchresults').hide( 5 );
        $( "body" ).removeClass( "modal-open" );
    });
});