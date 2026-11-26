<?php
// Isolated HTTP acceptance checks. Run with PHP CLI and pdo_sqlite from the repo root.
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Event;
use App\Models\StaffUser;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$app->detectEnvironment(fn () => 'testing');
config(['database.default'=>'acceptance','database.connections.acceptance'=>['driver'=>'sqlite','database'=>':memory:'],
    'session.driver'=>'array','cache.default'=>'array','mail.default'=>'array','mail.resend_key'=>null,'mail.mailers.array'=>['transport'=>'array'],
    'app.demo_staff_password'=>'Local-Test-Only-2026']);
Illuminate\Support\Carbon::setTestNow(today()->setTime(14, 0));
foreach (glob(__DIR__.'/../database/migrations/2026_01*.php') as $file) (require $file)->up();
DB::statement('ALTER TABLE registrations ADD COLUMN seat varchar(2)');
DB::statement("CREATE UNIQUE INDEX active_seat ON registrations(event_id,seat) WHERE status IN ('confirmed','checked_in')");
(new Database\Seeders\DatabaseSeeder)->run();

function httpCall($url, $data=null, $html=false) {
    global $kernel;
    $r=Request::create($url,$data===null?'GET':'POST',$data??[],[],[],['HTTP_ACCEPT'=>$html?'text/html':'application/json']);
    $response=$kernel->handle($r);
    return [$response->getStatusCode(),json_decode($response->getContent()?:'null',true),$response];
}
function check($label,$ok) {
    global $failed;
    echo ($ok?'PASS ':'FAIL ').$label.PHP_EOL;
    if (!$ok) $failed=true;
}
$meet=Event::where('title','Cebu Dev Meetup 2026')->firstOrFail()->id;
$work=Event::where('title','Cebu Design Workshop')->firstOrFail()->id;
$public="/data/events/$meet";
$staff="/data/staff/events/$meet";
$person=['full_name'=>'Test Visitor','email'=>'visitor@example.test','mobile'=>'09123456789','seat'=>'A1'];
[$status,$ticket]=httpCall("$public/register",$person);
check('Meetup registration returns confirmed ticket',$status===201 && $ticket['status']==='confirmed');
$identity=['ticket_code'=>$ticket['ticket_code'],'email'=>$person['email']];
check('Lookup recovers ticket',httpCall('/data/tickets/lookup',$identity)[1]['seat']==='A1');
foreach (['ticket_code'=>'EP-1','email'=>'other@example.test'] as $key=>$bad) {
    [$status,$body]=httpCall('/data/tickets/lookup',array_replace($identity,[$key=>$bad]));
    check("Wrong $key hides details",$status===404 && $body['message']==='Ticket not found' && !isset($body['full_name']));
}
check('Duplicate email blocked',httpCall("$public/register",$person)[0]===422);
[$status, $invalid] = httpCall("$public/register", array_replace($person, ['email'=>'bad','mobile'=>'0912345678']));
check('Both malformed fields rejected', $status === 422 && isset($invalid['errors']['email'], $invalid['errors']['mobile']));
$full=httpCall("/data/events/$work")[1];
check('Workshop full',count($full['occupied_seats'])===30 && $full['registrations_count']===30);
$guest=httpCall('/staff',null,true)[2];
check('Signed-out redirected',str_ends_with($guest->headers->get('Location')??'','/entrypass-staff'));
Auth::login(StaffUser::where('role','organizer')->firstOrFail());
$scan=fn($code)=>httpCall("$staff/check-in",['ticket_code'=>$code])[1];
check('Check in with name',$scan($ticket['ticket_code'])['full_name']===$person['full_name']);
$again=$scan($ticket['ticket_code']);
check('Repeat scan returns first timestamp',$again['status']==='already_checked_in' && $again['checked_in_at']===Event::find($meet)->registrations()->first()->checked_in_at->toJSON());
foreach (['EP-1',substr_replace($ticket['ticket_code'],$ticket['ticket_code'][5]==='Z'?'Y':'Z',5,1),Event::find($work)->registrations()->first()->ticket_code] as $c) check('Invalid scan',$scan($c)['status']==='invalid');
$list=httpCall("$staff/attendees")[1];
check('Attendee totals',$list['event']['registrations_count']===1 && $list['event']['checked_in_count']===1);
$row=$list['attendees'][0]['id'];
check('Checked-in cancellation blocked',httpCall("$staff/registrations/$row/cancel",[])[0]===422);
check('Undo audited and rescan succeeds',httpCall("$staff/registrations/$row/undo",[])[0]===204 && DB::table('audit_logs')->where('action','registration.check_in_undone')->exists() && $scan($ticket['ticket_code'])['status']==='checked_in');
$event=['title'=>'Acceptance event','description'=>'Test','venue'=>'Room','starts_at'=>today()->format('Y-m-d').'T00:00','ends_at'=>today()->format('Y-m-d').'T23:59','capacity'=>1,'status'=>'draft'];
[$status,$draft]=httpCall('/data/staff/events',$event);
$id=$draft['id']; $edit="/data/staff/events/$id"; $reg="/data/events/$id/register";
check('Draft invisible',$status===201 && httpCall("/data/events/$id")[0]===404 && !in_array($id,array_column(httpCall('/data/events')[1],'id')));
$event['status']='published';
check('Published visible',httpCall($edit,$event)[0]===200 && in_array($id,array_column(httpCall('/data/events')[1],'id')));
check('Bad time blocked',httpCall($edit,array_replace($event,['ends_at'=>today()->subDay()->format('Y-m-d').'T23:59']))[0]===422);
$a=httpCall($reg,$person)[1];
$b=httpCall($reg,array_replace($person,['email'=>'waiting@example.test','join_waitlist'=>1]))[1];
$scan2=fn($t)=>httpCall("$edit/check-in",['ticket_code'=>$t['ticket_code']])[1]['status'];
$next = httpCall($reg, array_replace($person, ['email'=>'next@example.test','join_waitlist'=>1]))[1];
check('Waitlist position',$b['status']==='waitlisted' && $b['waitlist_position']===1 && $next['waitlist_position']===2);
check('Waitlist scan',$scan2($b)==='waitlisted');
// Start the cancellation scenario in a fresh rate-limit window.
Illuminate\Support\Carbon::setTestNow(now()->addMinute()->addSecond());
httpCall('/data/tickets/cancel',['ticket_code'=>$a['ticket_code'],'email'=>$a['email']]);
check('Cancellation releases spot and invalidates admission',httpCall("/data/events/$id")[1]['registrations_count']===0 && $scan2($a)==='cancelled');
check('FIFO promotion and scan',httpCall("$edit/promote",[])[0]===204 && $scan2($b)==='checked_in' && $scan2($next)==='waitlisted');
check('Capacity below occupancy blocked',httpCall("/data/staff/events/$work",array_replace($event,['capacity'=>29]))[0]===422);
$dashboard=collect(httpCall('/data/staff/events')[1]['events'])->firstWhere('id',$meet);
check('Dashboard totals match',$dashboard['registrations_count']===$list['event']['registrations_count'] && $dashboard['checked_in_count']===$list['event']['checked_in_count']);
$csv=httpCall("$staff/export")[2]; ob_start();$csv->sendContent();$bytes=ob_get_clean();
if (isset($argv[1])) file_put_contents($argv[1], $bytes);
check('CSV contains attendee and code',str_contains($bytes,$person['email']) && str_contains($bytes,$ticket['ticket_code']));
Auth::login(StaffUser::where('role','door_staff')->firstOrFail());
check('Door staff cannot create or edit',httpCall('/data/staff/events',$event)[0]===403 && httpCall($edit,$event)[0]===403);
exit(empty($failed)?0:1);
