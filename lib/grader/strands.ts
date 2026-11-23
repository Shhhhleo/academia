import cueWeights from "./cue-weights.json"
import type { Strand } from "./rubrics"

/**
 * What each IB criterion's strands ask for, and the things students write when they are doing it.
 * Server only (imported by score.ts): the cue lists are large and compiled to regular expressions on first use.
 *
 * Cue format: alternatives separated by ", ". Each alternative counts once however often it appears,
 * so synonyms share one alternative ("strength*|strong point*"). "*" ends a word stem. "re:" starts a raw pattern, "cs:" a case-sensitive one.
 */
const r = String.raw
const j = (...parts: string[]) => parts.join(", ")
const st = (does: string, tip: string, cues: string, need = 4, weight = 1): Strand => ({ does, tip, cues, need, weight })

// ── Shared cues ───────────────────────────────────────────────────────────────
const QUOTE = r`re:["“][^"”\n]{3,}["”]|(?<![A-Za-z])['‘][^'’\n]{3,80}['’](?![A-Za-z])`
const CITE = r`re:\([A-Z][A-Za-z.&\s]+,?\s\d{4}[a-z]?(?:,\s?p+\.?\s?\d+)?\)|\[\d+\]|https?://|www\.`
const YEAR = r`re:\b(?:1[0-9]{3}|20[0-9]{2})\b`
const UNITS = r`re:\d+(?:\.\d+)?\s?(?:%|°C|°|m/s|kg|g|N|J|W|V|K|mol|cm|mm|km|m|s|Hz|Pa|kPa|ml|L|min|mins|seconds|minutes|hours|bpm)(?![A-Za-z])`
const STAT = r`re:\d+(?:\.\d+)?\s?(?:%|percent|million|billion|thousand)|\d+ out of \d+`
const NUMBERED = r`re:(?:^|\n)\s*(?:\d+[.)]|step \d)`
const EQUALS = r`re:[=≈]`
const SUMS = r`re:\d\s?[+\-×*/÷^]\s?\d|\^\d|√|²|³`
const REASON = r`because|since|due to|as a result|therefore|this means|this meant|so that|in order to|which means|this is why`
const EXAMPLE = r`for example|for instance|such as|e\.g`
const SHOWS = r`(?:this|which|that|it) (?:shows|suggests|implies|demonstrates|highlights|reveals|conveys|illustrates|indicates|tells|proves|signals)|showing|suggesting|revealing|implying`
const CONTRAST = r`however|on the other hand|in contrast|whereas|although|nevertheless|conversely`
const COMPARE = j(r`similar*|likewise|both`, r`differen*|unlike|whereas|in contrast`, r`compar*|contrast*`, r`link*|connect*|echo*|mirror*|parallel*`)
const SOURCES = j(CITE, r`bibliograph*|works cited|references|reference list`, r`according to|as (?:stated|noted|argued) by|source [a-z0-9]\b`, r`cit*|footnote*`)

const JUDGE_GOOD = r`successful*|success|effective*|worked well|works well|went well|works as|strength*|strongest|stronger|i am (?:pleased|happy|proud|satisfied)|best part|as i hoped|achiev*`
const JUDGE_BAD = r`did(?:n't| not) work|unsuccessful|less successful|less satisfied|weakness*|weakest|weaker|problem*|struggl*|difficult*|mistake*|limitation*|rushed|fail*|not as (?:good|well|strong|clear)`
const IMPROVE = j(r`improve*|improvement*`, r`next time|next step*|in (?:the )?future|if i (?:did|were|was|had|could|made|repeated)|in hindsight|looking back`, r`i would|could have|should have|would have|differently|instead|to address`)
const FEEDBACK = r`feedback|my teacher|teacher's|peer*|classmate*|suggested|advised|told me|comment*|visitor*|response*|reaction*|asked (?:me|whose|why|what)`
const LEARNED = r`i (?:have )?(?:learn(?:ed|t)|discovered|realis(?:e|ed)|realiz(?:e|ed)|understood|now (?:know|understand))|taught me|made me (?:realise|realize|think|understand)`
const FUTURE = r`in (?:the )?future|next (?:time|unit|project|piece|step)|from now on|going forward|i (?:want|plan|hope|aim) to|i will (?:practise|practice|try|keep|work|use|continue)|my (?:next )?goal`

const PERSPECTIVES = j(
  r`perspective*|viewpoint*|point of view|interpretation*|view|views|debate*|school of thought`,
  r`some (?:historians|people|argue|say|believe|economists|critics|might|would)|others (?:argue|say|believe|might|would)|critics|one could argue|it (?:could|can|might) be argued|is often (?:blamed|argued|said|seen|claimed)|traditional*|revisionist*|orthodox`,
  CONTRAST,
  r`counter*|challeng*|disagree*|oppos*|alternative*|contradict*`,
  r`impl*|consequence*|this means|meant that`,
)
const ARGUMENT = j(
  r`argu*|claim*|thesis|position|contend*`,
  r`therefore|thus|hence|consequently|as a result|which meant|this meant|so that`,
  r`because|since|given that|without|rather than|not only`,
  SHOWS,
  r`evidence|support*|prove*|demonstrat*`,
  r`most (?:important|significant)|main (?:cause|reason|factor)|primar*|key (?:cause|reason|factor)`,
)
const JUDGEMENT = j(
  r`to (?:a|an|some|a large|a great|a certain|a limited|a moderate|what) (?:\w+ )?extent|on balance|ultimately|overall|only partly|largely|mainly`,
  r`in conclusion|to conclude|in summary`,
  r`more (?:important|significant|convincing)|less (?:important|significant|convincing)|outweigh*|most (?:important|significant)`,
  r`evaluat*|judg*|assess*|weigh*|convinc*`,
  r`therefore|thus|hence|it can be argued|i (?:would )?argue`,
)
const CAUSE = j(
  r`cause*|led to|resulted in|result of|due to|because|triggered|contribut*`,
  r`effect*|impact*|consequence*|outcome*`,
  r`factor*|reason*|role|underlying|short[- ]term|long[- ]term`,
  r`relationship|link*|connect*|correlat*|depend*|interact*`,
  r`analys*|explain*|examin*|significan*|importan*`,
)
const OPVL = j(
  r`origin*|written by|published (?:in|by)|produced by|author*`,
  r`purpose|intended|written (?:to|for)|aim*|propaganda`,
  r`value*|valuable|useful*|insight|first-?hand|eyewitness|hindsight`,
  r`limit*|bias*|one-sided|subjective|incomplete|unreliab*|censor*|lacks|exaggerat*|selective|partial|cannot (?:tell|show|be)|does not (?:tell|show|mention)|only (?:shows|gives|one)`,
  r`source*|document*|historian*|primary|secondary|memoir*|speech|diary|letter*`,
)
const HUM_TERMS = j(
  r`econom*|trade|market*|industr*|inflation|unemployment|gdp|demand|supply`,
  r`politic*|government*|state|regime|polic*|democra*|dictator*|election*`,
  r`social|societ*|cultur*|class|religio*|ideolog*`,
  r`conflict|war|revolution*|treaty|alliance*|militar*|nationalis*|imperialis*|communis*|fascis*`,
  r`population|migration|urban*|rural|development|globali*|inequal*|sustainab*|resource*|climate`,
  r`power|authority|sovereign*|rights|justice|identity|change|continuity|system*`,
  r`stakeholder*|profit*|revenue|strategy|leadership|motivation|consumer*|firm*|business*`,
  r`cognitive|behaviour*|behavior*|schema*|memory|participant*|study|studies|experiment*|theory|theories|model*`,
  r`century|era|period|decade`,
)

const LIT_TECH = j(
  r`imagery|image*|visual*`,
  r`metaphor*|simile*|personif*|symbol*|motif*|allegor*`,
  r`tone|mood|atmosphere`,
  r`structure*|stanza*|form|enjambment|caesura|chapter*|scene*`,
  r`diction|word choice|language|lexis|register|connotation*`,
  r`narrator|speaker|narrative voice|point of view|perspective|characteris*`,
  r`alliteration|repetition|rhyme|rhythm|juxtapos*|irony|foreshadow*|contrast|hyperbole|anaphora|sibilance|onomatopoeia`,
  r`technique*|device*|feature*|authorial choice*|stylistic`,
  r`layout|colour*|color*|framing|caption*|headline|font|composition|camera|angle|slogan`,
)
const LIT_EFFECT = j(
  r`effect*|impact*`,
  r`the reader|readers|audience|viewer*`,
  r`suggest*|impl*|connot*`,
  r`convey*|portray*|present*|create*|evoke*|reveal*|reflect*`,
  r`emphasi*|highlight*|reinforc*|foreground*`,
  r`makes? (?:the reader|us|the audience|you)|invites|forces|positions|encourages`,
  r`feel*|sense of|sympath*|tension|unsettl*|powerful*|striking*|effective*`,
)
const LIT_KNOW = j(
  r`novel|play|poem*|text*|work*|extract|passage|advert*|article|speech|cartoon*`,
  r`author*|writer|poet|playwright|narrator|speaker|creator|photographer`,
  r`cs:\b(?!(?:That|There|What|Here|Where|She|Let|Who)['’]s)[A-Z][a-z]{2,}['’]s\b`,
  r`character*|protagonist|antagonist|relationship*|conflict|husband|wife|mother|father|daughter|son|hero*`,
  r`theme*|idea*|concern*|issue*|message|power|identity|freedom|gender|class|love|death|justice|memory|loss|oppress*|resist*|struggle`,
  r`context|society|histor*|cultur*|period|setting|published|written in`,
)
const LIT_INTERPRET = j(QUOTE, r`interpret*|reading|suggest*|impl*|represent*|symboli*|reveal*|explores|presents|portrays|conveys|illustrates|exposes|imagin*`, EXAMPLE + r`|as seen|in the (?:line|scene|final|opening|first|last)|at the (?:end|start|beginning)|when (?:she|he|they|the)|moment*`, SHOWS, REASON, r`yet|but|however|rather than|not only|instead`)

const SCI_TERMS = j(
  r`particle*|molecul*|atom*|ion*|electron*|proton*|nucle*`,
  r`cell*|enzyme*|gene*|dna|protein*|organism*|membrane|respiration|photosynthesis|bacteria|virus*`,
  r`energy|force*|mass|charge*|wave*|current|voltage|resistance|velocity|acceleration|momentum|pressure|density|frequency`,
  r`reaction*|bond*|concentration|solution|acid*|alkali*|compound*|element*|catalyst*|oxidation|temperature`,
  r`theor*|law|principle|model|concept|equation|formula`,
  r`rate|proportional|increase*|decrease*|collision*|kinetic|equilibrium|gradient`,
  r`ecosystem*|species|population|carbon|climate|radiation|emission*|fuel*|renewable`,
)
const SCI_EXPLAIN = j(SCI_TERMS, r`because|therefore|due to|as a result|this means|which causes|leads to|so the`, r`explain*|describ*|defin*`, r`process*|mechanism|function*|structure*`)
const SCI_APPLY = j(r`calculat*|substitut*|formula|equation`, EQUALS, UNITS, r`appl*|using|use of`, r`predict*|expect*|would|will`, r`in this (?:case|situation|example)|in real life|` + EXAMPLE, r`solve*|answer|therefore|so the`)
const VARIABLES = j(
  r`independent`,
  r`dependent`,
  r`control*|constant|kept the same|keep the same|fair test`,
  r`variable*`,
  r`measur*|record*|collect*|timed|stopwatch|thermometer|ruler|balance|cylinder|scale|sensor|probe|burette|pipette`,
  r`range|interval*|trial*|repeat*|three times|five times|average`,
  UNITS,
)
const METHOD = j(r`method|procedure|step*`, r`equipment|apparatus|material*`, r`safety|goggles|gloves|risk*|hazard*|careful*|ethic*|dispos*`, NUMBERED, r`first*|then|next|after|finally|repeat*`, r`measure*|pour*|add*|place*|heat*|record*|set up|connect*|weigh*`)
const DATA = j(r`table*|graph*|chart*|plot*|axis|axes`, r`average*|mean|total|calculat*|percentage*|rate|gradient`, r`trial*|repeat*|result*|data|reading*|measurement*`, UNITS, r`re:\d+\.\d+`, r`uncertaint*|error bar*|anomal*|outlier*|standard deviation|re:±`)
const TRENDS = j(r`trend*|pattern*|relationship|correlation|proportional`, r`increase*|decrease*|rose|fell|higher|lower|faster|slower|doubled|halved`, r`show*|suggest*|indicat*`, r`because|due to|this is because|explained by|as a result`, SCI_TERMS)
const METHOD_EVAL = j(
  r`reliab*|valid*|accura*|precis*|fair`,
  r`error*|uncertaint*|anomal*|outlier*|inconsisten*|limitation*|weakness*|problem*|flaw*`,
  r`systematic|random|human error|reaction time|parallax|heat loss|evaporat*|calibrat*`,
  r`control*|constant|variable*|equipment|apparatus|measur*|sample size`,
  r`affect*|effect on|led to|caused|overestimat*|underestimat*|skew*|which may|may have|might have`,
  r`method|procedure|experiment|investigation`,
)
const SCI_IMPROVE = j(
  r`improve*|improvement*|modif*`,
  r`next time|in future|if i (?:did|repeated|were)|could|would|should|instead`,
  r`more (?:trials|repeats|accurate|precise|data|readings)|repeat*|wider range|smaller interval*|digital|data ?logger|sensor|probe|insulat*|water bath|lid`,
  r`extend*|extension|further|another variable|different (?:variable|material|temperature|concentration)`,
  r`reduce*|minimi*|eliminat*|so that|this would|which would`,
)
const IMPLICATIONS = j(
  r`environment*|ecosystem*|pollut*|climate|habitat*|sustainab*|waste`,
  r`econom*|cost*|expens*|cheap*|afford*|jobs|money|profit*|invest*`,
  r`social|society|communit*|health|lives|famil*|access|inequal*`,
  r`ethic*|moral*|fair*|consent|animal testing|privacy|rights`,
  r`politic*|government*|law*|regulat*|polic*`,
  r`cultur*|belief*|religio*|tradition*`,
  r`advantage*|benefit*|positive`,
  r`disadvantage*|drawback*|negative|risk*|harm*|danger*|limitation*`,
  CONTRAST + r`|outweigh*|overall|in conclusion|i (?:think|believe)|in my opinion`,
)

const MATH_TOPICS = j(
  r`formula*|equation*|theorem|rule`,
  r`pythag*|trigonometr*|sin|cos|tan|radian*`,
  r`quadratic|linear|simultaneous|polynomial|function*|algebra*|logarithm*|exponential|logistic`,
  r`ratio|proportion|percentage*|interest`,
  r`probabilit*|mean|median|distribution*|regression|correlation|standard deviation|binomial|normal`,
  r`area|volume|perimeter|surface area|circumference|gradient`,
  r`derivative*|differentiat*|integra*|calculus|optimi*|maximum|minimum|rate of change`,
  r`sequence*|series|vector*|matri*`,
)
const MATH_SELECT = j(MATH_TOPICS, r`using|use|apply*|i (?:will|can|chose|used)|method|strategy|approach`, r`let [a-z]\b|where [a-z] is|unknown|given|we (?:know|need|want|have)`)
const MATH_WORK = j(EQUALS, SUMS, r`substitut*|rearrang*|simplif*|solv*|expand*|factoris*|factoriz*|divid*|multipl*|square root|calculat*|differentiat*|integrat*|equat*`, r`therefore|hence|thus|which gives|we get|this gives|it follows`, r`step*|first*|then|next`, r`re:\d+\.\d+`)
const MATH_ANSWER = j(r`answer|solution|result|total|final`, r`re:[=≈]\s?-?\d`, r`re:\d+(?:\.\d+)?\s?(?:cm|m|km|mm|kg|g|s|min|h|°|%|units|litres|ml)(?![A-Za-z])|[$€£₹]\s?\d`, r`re:(?:^|\n)\s*(?:\(?[a-z0-9]{1,2}[.)]|question \d|part [a-z0-9])`, r`check*|verif*`)
const MATH_NOTATION = j(r`re:[=≈<>≤≥±√²³^∫Σπ]`, r`term*|coefficient|variable*|expression|equation|sequence|linear|quadratic|constant|gradient|function|domain|range|parameter*`, r`let|where|denote*|represent*|defin*`)
const MATH_REPRESENT = j(r`table*`, r`diagram*|figure*|sketch*|drawing*`, r`graph*|plot*|axis|axes`, r`shows|shown|as seen|from the`)
const MATH_REASON = j(r`therefore|hence|thus|it follows|consequently|implies|which means`, r`because|since|given that`, r`prove*|proof|show that|justif*|verif*|check*|confirm*|deduc*|conclu*`, r`if .{2,40} then|must be|cannot|always|never|for all|assum*|suppose`, r`reasonable|makes sense|expected|consistent|as required`)

const ART_FORM = r`colour*|color*|line*|shape*|form|texture|tone|value|space|scale|weight|surface|composition|brushstroke*|brushwork|light|shadow|contrast|perspective|depth|emphasis|focal point|balance|proportion|rhythm|melody|harmony|tempo|dynamics|timbre|gesture|staging|costume|lighting|framing|editing`
const ART_MEDIA = r`technique*|medium|media|material*|oil|acrylic|watercolou?r*|ink|charcoal|pencil|marker*|collage|print*|clay|layer*|blend*|shad*|digital|photograph*`
const ART_MOVEMENT = j(
  r`movement|genre|style|period|tradition`,
  r`impressionis*|expressionis*|cubis*|surrealis*|realis*|pop art|renaissance|baroque|abstract*|modernis*|romantic*|minimalis*|street art|jazz|blues|classical|hip hop|ballet|contemporary|naturalis*|epic theatre|physical theatre|kabuki|film noir|neorealis*`,
  r`artist*|painter*|composer*|musician*|choreographer*|playwright*|director*|practitioner*|photographer*|sculptor*`,
  r`cs:\b(?!(?:That|There|What|Here|Where|She|Let|Who)['’]s)[A-Z][a-z]{2,}['’]s\b`,
  r`century|(?:1[5-9]|20)\d{2}`,
  r`context|histor*|origin*|began|emerged|society|cultur*|political|public|tradition*|memorial|at the time`,
  r`influenc*|inspir*|characteris*|known for|typical|rejected|reaction against|compar*|opposite|in contrast|both`,
  r`research*|source*|according to|found out|studying|i read|has spoken|interview*|i noticed`,
  r`sculpt*|install*|cast*|site|material*|concrete|silk|fabric|scale|surface|space|medium`,
)
const ART_CRITIQUE = j(
  QUOTE,
  r`titled|called|the (?:painting|piece|work|song|artwork|performance|play|scene|sculpture|photograph|film|installation)`,
  ART_FORM,
  r`mood|atmosphere|feeling|emotion*|message|meaning|symbol*|represent*`,
  r`effect*|creates|conveys|suggests|draws (?:the|my) eye|makes (?:me|the viewer|the audience)`,
  r`i think|in my opinion|i find|i feel|successful*|effective*|powerful|strik*`,
  ART_MEDIA,
)
const ART_EXPLORE = j(
  r`experiment*|tried|trial*|test*|explor*|practis*|practic*`,
  r`sketch*|draft*|thumbnail*|study|studies|mock-?up|maquette|rehears*|improvis*|storyboard*`,
  r`idea*|concept*|option*|version*|composition*`,
  ART_MEDIA,
  r`changed|develop*|refin*|improv*|adapt*|decided|chose|instead|worked better|did(?:n't| not) work`,
  REASON,
)
const ART_INTENT = j(
  r`intention|intend*|i want(?:ed)? to|my aim|aim is|my goal|i plan to|purpose`,
  r`show|convey|express|communicat*|represent|explore|message|meaning|make (?:the viewer|people|the audience)`,
  r`final (?:piece|artwork|work|performance|outcome)|artwork|piece|performance`,
  r`statement of inquiry|inquiry|global context|concept|theme|identity|connection|change|culture`,
  r`audience|viewer*|people`,
)
const ART_MAKE = j(r`created|made|painted|drew|built|composed|performed|produced|completed|exhibit*|curat*|present*`, ART_MEDIA, ART_FORM, r`piece|artwork|performance|outcome|final`, r`process|step*|first*|then|finally`)
const ART_APPRAISE = j(
  r`intention*|intended|i wanted|my aim|my goal|aimed|i set out|i hoped|as i hoped|i planned|original plan|my plan`,
  JUDGE_GOOD + r`|i like how`,
  JUDGE_BAD + r`|too (?:dark|light|flat|harsh|small|big|busy|plain|rushed)`,
  ART_FORM,
  r`draft|final|changed|added|moved|removed|at first|originally|compared|early|earlier|kept|replaced|promoted|testing|tested`,
  FEEDBACK,
  r`improve*|next time|if i (?:did|were|was|had|could)|i would|could have|should have|differently`,
  r`because|so that|this (?:makes|made|creates|created|draws|helps|helped|shows|gives|gave)|which (?:makes|made|creates|draws|helps|gives)`,
  r`viewer*|audience|visitor*|the eye|mood|atmosphere|communicat*|reads? as|meaning`,
)
const ART_GROWTH = j(
  LEARNED,
  r`i used to|before this|at the start|previously|in the past|i never|i always|early (?:work|samples|pieces|drafts)|earlier|at first|over the (?:project|unit|year|course)`,
  r`now i|i now|i can now|i have (?:become|developed|improved|grown)|i am (?:now|more|better|less)|largest change|biggest change|moving from|moved from|improved|progress*|develop*`,
  r`as an artist|as a (?:musician|performer|dancer|actor|filmmaker)|my (?:art|work|skills|style|practice|process|own|technique|stitching|drawing|painting|playing|time)`,
  r`skill*|confiden*|patien*|creativ*|observ*|` + ART_MEDIA,
  r`inspired|influenc*|artist*|style of|borrowed|adapted|took from`,
  FUTURE,
)

const PHE_KNOW = j(
  r`muscle*|cardiovascular|heart rate|aerobic|anaerobic|endurance|strength|flexib*|stamina|power|agility|speed|coordination|reaction time`,
  r`fitness|health*|nutrition|diet|hydrat*|sleep|recovery|injur*|warm[- ]?up|cool[- ]?down|stretch*`,
  r`principle*|fitt|frequency|intensity|overload|progression|specificity|reversibility|component*`,
  r`energy|oxygen|lactic|calorie*|carbohydrate*|protein|glycogen`,
  REASON,
  r`technique*|skill*|tactic*|strateg*|rule*`,
)
const PHE_APPLY = j(EXAMPLE + r`|in (?:football|basketball|swimming|running|badminton|volleyball|tennis|cricket|hockey|netball|athletics|gymnastics|a game|a match)|my (?:activity|event|sport|race|time|pace|position)`, r`should|need to|needs to|can improve|to improve|would help|i (?:run|ran|play|swim|train)|for me|in my`, r`so the|which means|this means|this is why|that is why|because|so i`, r`problem|issue|weakness*|risk*|injur*|fatigue|tired`, r`analys*|appl*|solve*|therefore|as a result`, r`plan*|train*|exercise*|drill*|session*`)
const PHE_GOALS = j(r`goal*|target*|aim*|objective*`, r`smart|specific|measur*|achievable|realistic|time[- ]bound|by the end|within \d|in \d+ weeks`, r`improve|increase|reduce|decrease|beat|reach`, r`re:\d+\s?(?:seconds|minutes|mins|km|m|kg|reps|sets|times|%|bpm|laps|weeks?)(?![A-Za-z])`, r`baseline|current*|at the moment|pre-?test|test result*|fitness test|beep test|cooper`)
const PHE_PLAN = j(
  r`plan*|program*|schedule|routine`,
  r`week \d|week one|each week|per week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|day \d|session*`,
  r`warm[- ]?up|cool[- ]?down|stretch*|rest|recovery`,
  r`exercise*|drill*|circuit*|interval*|run*|jog*|sprint*|push[- ]?ups|squats|plank*|reps|sets|laps`,
  r`fitt|frequency|intensity|overload|progress*|specific*`,
  r`because|so that|in order to|this will|which will|to (?:improve|build|increase|avoid|prevent)|justif*`,
  r`monitor*|track*|record*|measure*|test*|heart rate`,
)
const PHE_PERFORM = j(r`perform*|play*|execut*|demonstrat*`, r`skill*|technique*|pass*|shot*|serve*|dribbl*|tackle*|stroke*|footwork|stance`, r`tactic*|strateg*|position*|formation|space|movement|timing|decision*`, r`game|match|routine|practice`, r`appl*|used|adapted|improved|feedback`)
const PHE_PEOPLE = j(r`communicat*|listen*|talk*|encourag*|motivat*|support*|feedback`, r`team*|teammate*|partner*|group|peers|coach|captain|leader*`, r`cooperat*|collaborat*|respect*|trust|conflict*|disagree*|roles|responsib*|fair play|sportsmanship`, r`strateg*|by (?:giving|asking|listening|sharing|encouraging|setting)|helped|improved`)
const PHE_PLAN_EVAL = j(
  r`plan*|program*|training|schedule`,
  r`goal*|target*|aim*`,
  r`result*|outcome*|post-?test|re-?test|score*|improved (?:by|from)|increased|decreased`,
  r`re:\d+\s?(?:seconds|minutes|km|m|kg|reps|%|bpm|laps)(?![A-Za-z])`,
  r`effective*|successful*|worked|achiev*|reached|met my|did(?:n't| not) (?:reach|meet|achieve)`,
  REASON,
  r`change|next time|should have|could have|improve*|adjust*|differently`,
)
const PHE_PERF_EVAL = j(r`performance|perform*|played|technique*|skill*`, r`strength*|good at|did well|best`, r`weakness*|struggl*|mistake*|need to (?:work|improve)|not (?:good|strong|consistent)|poor`, r`improve*|practis*|practic*|focus on|work on|next step*|feedback`, r`during|in the (?:game|match|test|assessment|routine)|video|observ*`)

const SPEC = j(
  r`specification*|success criteria|criteria|requirement*`,
  r`must|should|needs to|has to`,
  r`size|dimension*|cost*|budget|material*|function*|aesthetic*|safety|durab*|weight|ergonom*|environment*`,
  r`measur*|test*|justif*|` + REASON,
  r`re:\d+\s?(?:cm|mm|m|g|kg|minutes|hours|%)(?![A-Za-z])|[$€£₹]\s?\d`,
  r`less than|at least|no more than|under`,
)
const TEST_DATA = j(r`test*`, r`method*|procedure|how i|i asked|i gave|i measured`, r`survey*|questionnaire*|interview*|user trial*|observation*|rating*|scale of|out of (?:5|10)|feedback`, r`measur*|data|result*|score*|average`, STAT, r`criteria|specification*|against`)
const AGAINST_SPEC = j(
  r`specification*|criteria|criterion|requirement*`,
  r`met|meets|achiev*|fulfil*|satisf*|passed|successful*|success`,
  r`did(?:n't| not) (?:meet|achieve|pass)|failed|partly|partially|not fully|unsuccessful|weakness*|problem*`,
  r`evidence|result*|test*|show*|feedback|` + REASON,
  r`strength*|works well|effective*|overall|however|although`,
)
const PLAN_STEPS = j(
  r`plan*|schedule|timeline|gantt|step*|stage*|milestone*|task*`,
  r`time|minutes|hours|lesson*|week*|day*|month*|deadline*|date*`,
  r`resource*|material*|tool*|equipment|software|budget|supervisor`,
  r`first*|then|next|after|finally|before|order|sequence`,
  NUMBERED,
  r`safety|quality|check*|review*`,
)

const B_MESSAGE = j(EXAMPLE + r`|like`, r`because|since|so|as a result|that is why|therefore`, r`first*|second*|also|in addition|moreover|furthermore|finally|another`, r`however|although|but|on the other hand`, r`i think|i believe|in my opinion|personally|i feel`, r`re:\d`)
const TEXT_TYPE = j(
  r`re:^[^\n.!?]{3,90}(?:\n|$)`,
  r`dear|hi|hello|hey|welcome|good (?:morning|afternoon|evening)|ladies and gentlemen|fellow students`,
  r`regards|sincerely|best wishes|yours|see you|thanks for reading|thank you for (?:reading|listening)|let me know|stay tuned|comment*|subscribe|cheers|until next time`,
  r`re:\n[^\n.!?]{3,60}:?\n`,
  r`re:\d{1,2}(?:st|nd|rd|th)?\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|posted|by [A-Z][a-z]+`,
)
const REGISTER = j(r`you|your|you're|we|us|our|let's`, r`re:\?`, r`re:!`, r`i think|i believe|in my opinion|honestly|personally|trust me|believe me`, r`should|must|need to|have to|why not|try|make sure|don't forget|remember`, r`please|would like|i am writing|could you|grateful|kindly`)
const COMPREHEND = j(
  r`main idea*|gist|message|about`,
  r`detail*|fact*|information`,
  r`the (?:text|article|author|writer|speaker|passage|blog|narrator) (?:says|states|mentions|explains|describes|tells|shows|writes|argues)|according to`,
  r`impl*|suggest*|infer*|we can (?:tell|see|understand)|this (?:shows|means)`,
  QUOTE,
)
const CONVENTIONS = j(r`purpose|aim*|to (?:inform|persuade|entertain|advise|warn)`, r`audience|reader*|listener*|teenager*|young people`, r`format|text type|headline|title|heading*|subheading*|caption*|image*|photo*|layout`, r`style|tone|register|formal|informal`, r`convention*|feature*|uses|includes`)
const PERSONAL_LINK = j(r`in my (?:opinion|view|experience|country|culture|school)|i think|i believe|i agree|i disagree`, r`similar*|differen*|compar*`, r`my own|personally|for me|my (?:family|friends|life)`, r`connect*|relate*|remind*`)

const ANY_TERMS = j(HUM_TERMS, SCI_TERMS, LIT_TECH, LIT_KNOW)
const RQ = j(r`research question|rq|inquiry question|fieldwork question|aim|this (?:investigation|study|report|essay|exploration)`, r`to what extent|how far|how does|what is the effect|effect of|relationship between|investigat*|determin*|examin*`, r`re:\?`, r`focus*|scope|specific*|narrow*|limited to`, r`relevan*|rationale|importan*|worth*|significan*|interest*|background|context`)
const EVIDENCE_ANALYSIS = j(r`data|result*|finding*|evidence|figure*|table*|statistic*|source*`, STAT, r`analys*|show*|suggest*|indicat*|reveal*|demonstrat*|support*`, r`because|therefore|as a result|consequently|this means|due to|explained by|consistent with`, r`compar*|whereas|however|in contrast|higher|lower`)
const CRITICAL = j(CONTRAST, r`counter*|alternative*|critic*|challeng*|contradict*|oppos*|debate*`, r`limitation*|weakness*|bias*|reliab*|valid*|assum*|uncertain*|flaw*|questionable|sample size|generalis*|generaliz*`, r`evaluat*|assess*|strength*|convinc*|significan*|weigh*`, r`conclu*|overall|ultimately|to (?:a|some|a large) extent|further research|recommend*`)
const SECTIONS = j(r`introduction|aim|rationale`, r`method*|procedure|approach`, r`results|analysis|discussion|findings`, r`conclusion|evaluation|reflection`, r`contents|appendix|appendices|word count|figure \d|table \d`)

// ── Strands per rubric (keyed by the rubric label builtInRubric returns) and criterion ──
export const STRANDS: Record<string, Record<string, Strand[]>> = {
  "MYP Language and literature criteria": {
    A: [
      st("analyse the text's language, structure and techniques", "Name the techniques the writer uses (imagery, tone, structure) and say what each one does.", LIT_TECH, 5),
      st("explain the effect of the writer's choices on the reader", "After each technique, explain its effect: what it makes the reader think or feel.", LIT_EFFECT),
      st("justify your ideas with quotations and explanation", "Back each idea with a short quotation, then explain it (\"this suggests…\").", j(QUOTE, EXAMPLE, SHOWS, r`the (?:word|phrase|line|quote|quotation)s?`, REASON)),
      st("compare features within and across texts", "Connect features: compare parts of the text, or this text with another.", COMPARE, 3, 0.5),
    ],
    C: [
      st("show insight and your own perspective", "Give your own interpretation and consider another way of reading it.", j(r`i believe|i think|in my (?:view|opinion)|my (?:view|opinion|interpretation)`, r`perspective*|viewpoint*`, r`insight*|interpret*`, r`alternative*|another way|on the other hand`, r`personal*|my own|imagin*|creativ*|original`), 3),
      st("make stylistic choices with the audience in mind", "Explain or show the style, tone and devices you chose for your audience.", j(r`audience|reader*`, r`style|stylistic|tone|register`, r`device*|technique*`, r`effect*|impact`), 3),
      st("select relevant details and examples", "Develop each idea with a specific detail or example.", j(EXAMPLE, r`detail*|example*|specific*`, QUOTE), 2),
    ],
  },
  "MYP Language acquisition criteria": {
    A: [
      st("identify stated and implied information", "Give the main idea and supporting details, and say what is implied.", COMPREHEND),
      st("analyse conventions such as format, purpose and audience", "Say what kind of text it is, who it is for and how you can tell.", CONVENTIONS, 3),
      st("connect the text to your own experience and views", "Link the text to your own experience or opinion.", PERSONAL_LINK, 3),
    ],
    B: [
      st("identify stated and implied information", "Give the main idea and supporting details from the text, and say what is implied.", COMPREHEND),
      st("analyse conventions such as format, purpose and audience", "Say what kind of text it is, who it is for and how you can tell.", CONVENTIONS, 3),
      st("connect the text to your own experience and views", "Link the text to your own experience or opinion.", PERSONAL_LINK, 3),
    ],
  },
  "MYP Individuals and societies criteria": {
    A: [
      st("use subject terminology in context", "Use the subject's own terms (for example cause, consequence, sovereignty, sustainability) and show what they mean here.", HUM_TERMS, 6),
      st("show knowledge through descriptions, explanations and examples", "Support each point with a specific fact, date or example, and explain it.", j(EXAMPLE, YEAR, r`because|led to|resulted in|caused|as a result|therefore|due to|this meant`, r`defin*|refers to|is when|means that`, r`explain*|describ*`, STAT)),
    ],
    B: [
      st("state a clear research question and justify why it matters", "Write your research question and explain why it is worth investigating.", RQ, 3),
      st("follow an action plan", "Set out your action plan: the steps, in order, with dates.", PLAN_STEPS, 3),
      st("use research methods to collect and record information", "Say which sources and methods you used, and how you recorded what you found.", j(r`source*|website*|book*|article*|document*`, r`primary|secondary`, r`interview*|survey*|questionnaire*|observation*|data`, r`notes|recorded|collected|gathered|found`, r`cit*|referenc*|bibliograph*`, r`method*|search*`)),
      st("evaluate the process and results of your investigation", "Judge your investigation: what worked, what limited it, and what you would change.", j(JUDGE_GOOD, JUDGE_BAD, IMPROVE, r`reliab*|bias*|accura*|trust*`, r`result*|finding*|conclu*|answer*`)),
    ],
    C: [st("document your sources with a recognised convention", "Cite your sources in the text (author, year) and add a bibliography.", SOURCES, 2)],
    D: [
      st("discuss concepts, issues and theories", "Discuss the concepts and issues behind the question, not just the events.", j(r`concept*|issue*|theor*|model*`, r`discuss*|consider*|examin*|explor*`, r`factor*|cause*|consequence*|impact*|effect*`, r`significan*|importan*|role`), 3),
      st("combine information into a valid argument", "Build an argument: make a claim, support it with evidence and say what it shows.", ARGUMENT),
      st("evaluate sources by origin, purpose, value and limitations", "For each source, say where it comes from, why it was made, and how that makes it useful or limited.", OPVL),
      st("interpret different perspectives and their implications", "Set out at least two perspectives and what each one means for the question.", PERSPECTIVES),
    ],
  },
  "MYP Sciences criteria": {
    A: [
      st("explain scientific knowledge", "Explain the science behind your answer using the correct terms and a reason (\"because…\").", SCI_EXPLAIN, 6),
      st("apply science to solve problems", "Apply the science to the situation: use the formula, show the calculation, give units.", SCI_APPLY),
      st("analyse information to make scientifically supported judgements", "Use the evidence to reach a judgement, and say how strong that evidence is.", j(r`evidence|data|result*|graph|table|source*`, r`suggest*|show*|indicat*|support*`, r`conclu*|judg*|overall|therefore`, CONTRAST + r`|limit*|reliab*|valid*`, r`compar*|evaluat*|analys*|advantage*|disadvantage*`)),
    ],
    B: [
      st("explain the problem or question to be tested", "State the question you are testing and the science behind it.", j(r`research question|aim|purpose|problem|investigat*|find out|determine`, r`how does|what is the effect|effect of|affect*|relationship between`, r`re:\?`, r`background|theory|known that|according to|because`), 3),
      st("state a testable hypothesis and explain it with science", "Write your hypothesis as \"If… then… because…\", using scientific reasoning.", j(r`hypothes*|predict*`, r`if .{3,80} then|i (?:think|expect|predict)|will (?:increase|decrease|be|rise|fall|double|change)`, r`because|since|due to|this is because`, r`more|less|faster|slower|higher|lower|increase*|decrease*|proportional|double*`, SCI_TERMS)),
      st("explain how you will change, measure and control the variables", "Name the independent, dependent and controlled variables, and how each is measured or kept the same.", VARIABLES, 5),
      st("design a complete, safe method", "Write the method as numbered steps with equipment, repeats and safety.", METHOD),
    ],
    C: [
      st("present collected and processed data", "Present your data in a table with units, and process it (averages, a graph).", DATA),
      st("interpret the data and explain results with science", "Describe the trend in your data and explain it scientifically.", TRENDS),
      st("evaluate whether the results support the hypothesis", "Say whether the data support your hypothesis, quoting results.", j(r`hypothes*|predict*`, r`support*|agree*|confirm*|consistent|match*|prove*|disprove*|reject*|contradict*|correct|incorrect`, r`conclu*|therefore|overall`, r`data|result*|evidence|as shown`), 3),
      st("evaluate the validity of the method", "Evaluate the method: sources of error, how reliable the data are, and what each problem did to the results.", METHOD_EVAL),
      st("explain improvements or extensions", "Give specific improvements and a way to extend the investigation.", SCI_IMPROVE, 3),
    ],
    D: [
      st("explain how science is applied to address a specific problem", "Explain the problem and how the science is used to address it.", j(r`problem|issue|challenge|need`, r`solution*|solve*|address*|tackle*|reduce*|prevent*|treat*`, r`technolog*|applicat*|used to|use of|develop*|invent*|design*`, r`work*|by (?:using|converting|absorbing|removing|changing)|process`, SCI_TERMS)),
      st("discuss and evaluate the implications of using science", "Weigh the implications from several angles (environmental, economic, social, ethical) and reach a view.", IMPLICATIONS, 6),
      st("use scientific language", "Use precise scientific terms throughout.", SCI_TERMS, 4, 0.5),
      st("document your sources", "Cite your sources in the text and list them at the end.", SOURCES, 2, 0.5),
    ],
  },
  "MYP Mathematics criteria": {
    A: [
      st("select the right mathematics for the problem", "State which rule, formula or method you are using and why.", MATH_SELECT, 3),
      st("apply it and show your working", "Show every step of your working, line by line.", MATH_WORK),
      st("reach answers in a range of contexts", "Finish each question with a clear final answer and units.", MATH_ANSWER, 3),
    ],
    B: [
      st("use problem-solving techniques to find the pattern", "Show how you found the pattern: a table of values and what changes each time.", j(r`pattern*`, r`table|list|diagram|term*|sequence*|stage*|row*|column*`, r`differen*|increase*|goes up|adds|multipl*|double*|each time|every time|constant|common`, r`notic*|observ*|found|see that|tried|test*|predict*`, r`n ?= ?\d|when n|for n|the next|the \d+(?:st|nd|rd|th)`)),
      st("describe the pattern as a general rule", "Write the pattern as a general rule or formula in terms of n.", j(r`general rule|rule|formula|general*|nth term|expression`, r`re:\b[a-zA-Z]\(?n\)?\s?=|\d+n\b|n\^2|n²|\bn\b`, r`for (?:any|all|every)|always|in general|any value`), 2),
      st("prove, or verify and justify, the rule", "Test the rule with values you have not used, and explain why it works.", j(r`verif*|check*|test*|substitut*|works|correct|matches|holds|true`, r`prove*|proof|justif*|this is because|reason|therefore|hence|because|since`, r`when n ?= ?\d|for n ?= ?\d`, r`each (?:time|step|stage|term)|every (?:time|step|stage|term)|adds|added|geometr*|algebraic*|difference`), 3),
    ],
    C: [
      st("use correct mathematical language, notation and symbols", "Use correct notation and terms, and define your variables.", MATH_NOTATION, 2),
      st("use different representations such as tables, diagrams and graphs", "Represent the maths in more than one way (a table, a diagram, a graph) and refer to them.", MATH_REPRESENT, 2),
      st("give complete, coherent lines of reasoning", "Link your steps with \"therefore\", \"so\" and \"because\" so the reasoning can be followed.", MATH_REASON, 2),
    ],
    D: [
      st("identify the relevant elements of the real-life situation", "Start by stating what the situation gives you and what you need to find.", j(r`cost*|price*|budget|profit|speed|distance|time|height|area|volume|length|width|weight|population|rate|amount|number of|capacity|temperature|interest|salary|discount`, r`given|we know|information|the problem|need to find|required|constraint*|assum*`, r`real|situation|context|scenario`), 2),
      st("select and apply mathematical strategies to reach a solution", "Choose a method, show the working and reach a solution.", j(MATH_SELECT, MATH_WORK)),
      st("justify the degree of accuracy of your solution", "Say how you rounded your answer and why that accuracy is sensible.", j(r`round*|decimal place*|significant figure*|nearest|approximate*|estimate*|exact`, r`accura*|precis*|error|margin`, r`sensible|appropriate|reasonable|because|since`), 2),
      st("justify whether the solution makes sense in the context", "Explain whether your answer is realistic in the real situation, and what it leaves out.", j(r`makes sense|make sense|realistic|reasonable|sensible|unrealistic|practical`, r`in (?:real life|reality|context|practice)|real-life|real world`, r`however|but|limit*|assum*|does not (?:account|consider|include)|ignores|would not|might not`, r`because|since|therefore`), 3),
    ],
  },
  "MYP Arts criteria": {
    A: [
      st("investigate a movement or genre", "Explain the movement or genre: when and why it began, its key artists and its typical features.", ART_MOVEMENT, 5),
      st("critique an artwork or performance from it", "Critique one named work: describe what you see or hear, how it was made, its effect and your judgement.", ART_CRITIQUE, 5),
    ],
    B: [
      st("explore ideas practically to inform your final piece", "Show your experiments: what you tried, what worked or didn't, and what you changed.", ART_EXPLORE, 5),
      st("present a clear artistic intention", "State your intention: what the final piece will show, to whom, and how it links to the unit.", ART_INTENT),
    ],
    C: [st("describe how you created or performed the work", "Describe the techniques and skills you used to make the final piece.", ART_MAKE)],
    D: [
      st("appraise your own artwork or performance", "Judge your work against your intention: what worked, what didn't, and why. Refer to elements such as colour, contrast and composition, the changes you made and the feedback you got.", ART_APPRAISE, 7),
      st("reflect on your development as an artist", "Reflect on your growth: what you used to do, what you learned, who influenced you and what you will work on next.", ART_GROWTH, 5),
    ],
  },
  "MYP Physical and health education criteria": {
    A: [
      st("explain physical and health knowledge", "Explain the fitness or health ideas involved, using the correct terms.", PHE_KNOW, 5),
      st("apply that knowledge to analyse issues and solve problems", "Apply the knowledge to a real situation in your sport or plan.", PHE_APPLY),
    ],
    B: [
      st("set goals to improve performance", "Set a specific, measurable goal with a baseline and a deadline.", PHE_GOALS),
      st("design, explain and justify a plan", "Lay out the plan session by session and justify each part (\"this will… because…\").", PHE_PLAN, 6),
    ],
    C: [st("describe how you applied skills, techniques and strategies", "Describe the skills, techniques and tactics you used in performance.", PHE_PERFORM)],
    D: [
      st("explain strategies that improved your interpersonal skills", "Explain how you worked with others: how you communicated, encouraged and solved disagreements.", PHE_PEOPLE),
      st("evaluate how effective your plan was, based on the outcome", "Compare your results with your goal, and explain why the plan did or didn't work.", PHE_PLAN_EVAL, 5),
      st("analyse and evaluate your performance", "Name your strengths and weaknesses in performance and your next steps.", PHE_PERF_EVAL),
    ],
  },
  "MYP Design criteria": {
    A: [
      st("explain and justify the need for a solution for your client or target audience", "Explain the problem, who has it, and the evidence that a solution is needed.", j(r`problem|need*|issue|challenge|struggle*|difficult*`, r`client|target audience|user*|customer*|people who`, r`solution|product|solve|help`, r`justif*|importan*|evidence|survey*|interview*|found that|` + REASON, STAT)),
      st("identify and prioritise the research needed", "List the research you need, primary and secondary, in order of priority.", j(r`research*`, r`primary|secondary`, r`priorit*|most important|high priority|essential`, r`question*|find out|need to know|investigat*`, r`interview*|survey*|questionnaire*|observ*|website*|source*|expert*`)),
      st("analyse existing products that inspire a solution", "Analyse existing products: strengths, weaknesses and what you will take from each.", j(r`existing (?:product*|solution*|design*)|similar product*|competitor*|product (?:1|2|3|a|b|c|one|two)|on the market`, r`strength*|advantage*|pros|works well`, r`weakness*|disadvantage*|cons|problem*|lacks|too (?:expensive|heavy|big|small|complicated)`, r`feature*|function*|material*|cost*|price*|size|aesthetic*|ergonomic*|durab*`, r`inspir*|take from|i (?:could|will|can) (?:use|include|adapt|avoid)`)),
      st("write a design brief that sums up your research", "Finish with a design brief: what you will make, for whom, and the key requirements from your research.", j(r`design brief|brief`, r`i will (?:design|create|make|develop|build)|my (?:solution|product) will|the product (?:will|should|must)`, r`target audience|client|user*`, r`based on|from my research|research show*|summar*|therefore|overall`, r`must|should|needs to|requirement*|constraint*`), 3),
    ],
    B: [
      st("write a design specification with success criteria", "List measurable requirements the solution must meet, with a reason for each.", SPEC),
      st("develop a range of feasible design ideas", "Present several different ideas with annotations, pros and cons.", j(r`idea (?:1|2|3|4|one|two|three|four)|design (?:1|2|3|4|one|two|three|four|a|b|c)|first (?:idea|design)|second (?:idea|design)|third (?:idea|design)|another (?:idea|design)|alternative*|option*`, r`sketch*|drawing*|draw*|annotat*|label*|diagram*|model*|prototype*|mock-?up`, r`feature*|shape|colour*|material*|mechanism|layout|function*`, r`advantage*|disadvantage*|pros|cons|strength*|weakness*`, r`feasib*|realistic|possible|practical|easy to make|difficult to make`)),
      st("present your chosen design and justify the choice", "Say which design you chose and justify it against the specification.", j(r`chosen|i chose|i have chosen|i decided|final design|selected|best (?:idea|design|option)`, r`justif*|reason*|` + REASON, r`specification*|criteria|meets|fulfil*|satisf*|score*|compared|feedback|client|target audience`), 3),
      st("give planning drawings and the requirements for making it", "Add planning details: dimensions, materials, tools and the order of steps.", j(r`drawing*|diagram*|orthographic|isometric|blueprint*|template|wireframe*|storyboard*|flowchart*|cad|scale`, r`dimension*|measure*|size*`, r`re:\d+\s?(?:cm|mm|m|px|inch|inches)(?![A-Za-z])`, r`material*|tool*|equipment|component*|part*|resource*|software`, r`step*|stage*|order|time|cost*|quantit*|list`)),
    ],
    C: [
      st("write a logical plan that uses time and resources well", "Write the making plan as ordered steps with time and resources for each.", PLAN_STEPS),
      st("show technical skill in making the solution", "Describe the techniques and tools you used and how you kept the quality high.", j(r`cut*|measur*|sand*|glu*|drill*|saw*|solder*|sew*|stitch*|paint*|assembl*|join*|print*|cod*|program*|edit*|laser|mould*|shap*|fold*|attach*`, r`tool*|machine*|equipment|software|technique*|skill*`, r`accura*|careful*|precis*|neat*|quality|finish*`, r`made|built|created|constructed|produced|completed`)),
      st("follow the plan so the solution works as intended", "Show that you followed the plan and that the finished solution works.", j(r`followed|according to (?:the|my) plan|as planned|on (?:time|schedule)`, r`work*|function*|as intended|successfully|complete*|finished|final product`, r`photo*|picture*|evidence|shows|stage*`, r`problem*|issue*|fixed|solved|overcame`), 3),
      st("justify the changes you made to the design and plan", "List each change you made and the reason for it.", j(r`chang*|modif*|adjust*|alter*|adapt*|instead|replace*|switch*|redesign*`, r`justif*|reason*|` + REASON, r`original*|intended|at first|initially`, r`problem*|issue*|did(?:n't| not) (?:work|fit)|too (?:big|small|weak|heavy|long|short|difficult)|ran out|not enough|broke`, r`improve*|better|stronger|easier|quicker|safer`)),
    ],
    D: [
      st("design testing methods that produce data", "Describe how you tested the solution and the data each test gave.", TEST_DATA),
      st("evaluate the solution against the design specification", "Go through the specification point by point: met, partly met or not met, with evidence.", AGAINST_SPEC),
      st("explain how the solution could be improved", "Explain specific improvements and what each would achieve.", j(r`improve*|improvement*`, r`could|would|should|next time|in future|if i (?:made|did|had|were)`, r`change|add|replace|redesign|stronger|lighter|smaller|bigger|cheaper|different material|more time`, r`so that|this would|which would|in order to|because`), 3),
      st("explain the impact of the solution on the client or target audience", "Explain what difference the solution makes for the client or target audience.", j(r`impact*|effect*|difference|benefit*|help*|useful`, r`client|target audience|user*|customer*`, r`can now|able to|easier|faster|saves|saving|safer|more (?:organised|organized|confident|comfortable|efficient)`, r`this means|as a result|feedback|said|told me|comment*|` + REASON), 3),
    ],
  },
  "MYP Personal project criteria": {
    A: [
      st("state a learning goal and explain the personal interest behind it", "State your learning goal and explain the personal interest that led to it.", j(r`learning goal|my goal|goal is|i want(?:ed)? to learn|aim*`, r`interest*|passion*|always (?:loved|wanted|been|enjoyed)|hobby|curious|fascinat*|enjoy*|care about|inspired`, r`led me|this is why|reason|` + REASON, r`learn*|understand|find out|develop|knowledge`), 3),
      st("state an intended product and its success criteria", "Describe the product and list success criteria you can measure.", j(r`product|outcome|i will (?:create|make|build|write|design|produce|organise|organize|develop)`, r`success criteria|criteria|criterion|successful if`, r`specific|measur*|test*|at least|quality|function*|audience|deadline`, r`appropriate|justif*|because|so that`), 3),
      st("present a clear, detailed plan", "Lay out your plan as dated steps with the resources you need.", PLAN_STEPS),
    ],
    B: [
      st("explain how ATL skills helped you achieve your learning goal", "Name the ATL skills (research, thinking) you used for your learning goal, with a specific example of each.", j(r`atl|approaches to learning|skill*`, r`research*|information literacy|media literacy|source*|notes`, r`thinking|critical*|creative*|transfer|problem[- ]solving|analys*`, r`learning goal|learn*|understand*|knowledge`, EXAMPLE + r`|when i|i used|i applied`, r`this helped|helped me|allowed me|so that|as a result|which meant|because`), 5),
      st("explain how ATL skills helped you achieve your product", "Name the ATL skills (self-management, communication, social) you used for your product, with a specific example of each.", j(r`self[- ]management|organis*|organiz*|time management|deadline*|schedule|priorit*|resilien*|persever*`, r`communicat*|feedback|interview*|email*|present*|supervisor|expert`, r`social|collaborat*|team*|help from|worked with|meeting*`, r`product|outcome|made|create*|built|final`, EXAMPLE + r`|when i|i used|i applied`, r`this helped|helped me|allowed me|so that|as a result|which meant|because`, r`problem*|challenge*|difficult*|overcame|solved`), 5),
    ],
    C: [
      st("explain the impact of the project on you and your learning", "Explain how the project changed you as a learner, with examples.", j(r`impact*|changed|influence*|affected`, LEARNED + r`|i (?:developed|improved|became|grew|gained)`, r`as a learner|as a person|myself|my (?:learning|confidence|skills|future|perspective|understanding)`, r`confiden*|independ*|patien*|resilien*|organis*|organiz*|proud`, FUTURE, REASON)),
      st("evaluate the product against your success criteria", "Evaluate the product against each success criterion, with evidence.", j(AGAINST_SPEC, r`product|outcome|final`, STAT, r`survey*|rating*|response*`, IMPROVE), 5),
    ],
  },

  "DP Language A essay criteria": {
    A: [
      st("show knowledge and understanding of the works", "Show you know the works: refer to specific moments, characters and contexts.", LIT_KNOW),
      st("interpret the works in relation to the question", "Interpret, don't retell: say what each reference suggests about the question.", LIT_INTERPRET),
      st("compare the works", "Compare the works directly throughout.", COMPARE, 3, 0.5),
    ],
    B: [
      st("analyse how language, technique and style shape meaning", "Name the writers' techniques and analyse how each shapes meaning.", LIT_TECH, 5),
      st("evaluate the writers' choices and their effects", "Evaluate the effect of each choice on the reader, and how well it works.", LIT_EFFECT),
    ],
    C: [st("keep a clear line of argument focused on the question", "State a thesis and return to it in each paragraph's first sentence.", j(r`thesis|this essay|i (?:will )?argue|argue*|will explore|the question`, r`ultimately|overall|in conclusion|to conclude|therefore`, r`both|whereas|while|similarly|in contrast|however`, r`firstly|furthermore|moreover|additionally|in addition|finally`), 3)],
  },
  "DP Language A individual oral criteria": {
    A: [
      st("show knowledge of the extracts, the works and the global issue", "Show you know the extracts and their wider works, and name the global issue clearly.", j(r`global issue`, LIT_KNOW), 5),
      st("interpret them in relation to the global issue", "Interpret each reference: say what it suggests about the global issue.", LIT_INTERPRET),
    ],
    B: [
      st("analyse how authorial choices shape meaning", "Name the authorial choices in each text and analyse how they shape meaning.", LIT_TECH, 5),
      st("evaluate how those choices present the global issue", "Evaluate how each choice presents the global issue to the audience.", LIT_EFFECT),
    ],
    C: [st("keep a balanced, sustained focus on the global issue", "Give both texts equal time and tie every point back to the global issue.", j(r`global issue`, r`extract|passage|literary (?:work|text)|non-literary|body of work|both (?:texts|works)`, r`firstly|first|to begin|moving on|turning to|next|secondly|finally|in conclusion|to conclude|overall`, r`similarly|in contrast|whereas|both|however|link*|connect*`), 3)],
  },
  "DP Language B writing criteria": {
    B: [
      st("develop relevant ideas", "Develop each idea fully: state it, explain it and link it to the task.", B_MESSAGE, 5),
      st("support ideas with details, examples and explanations", "Add a specific detail or example to each idea.", j(EXAMPLE + r`|like`, r`because|since|as a result|that is why|therefore|this means`, r`re:\d`, r`when i|last (?:year|week|month|summer)|once|my (?:friend|family|school|teacher|brother|sister|mother|father|parents)`, r`imagine|picture|think about`), 3),
    ],
    C: [
      st("use the conventions of the text type", "Use the text type's conventions: a title or greeting, the right layout, and a proper close.", TEXT_TYPE, 3),
      st("suit the register and tone to the audience and purpose", "Match the tone to your audience: address them directly and keep the register consistent.", REGISTER, 3),
    ],
  },
  "DP Language B individual oral criteria": {
    B1: [st("describe the visual stimulus and link it to the target culture", "Describe what the image shows and connect it to the theme and culture.", j(r`image|picture|photo*|stimulus|we can see|shows|in the (?:foreground|background)|there (?:is|are)`, r`cultur*|tradition*|country|society|theme`, r`describe*|depict*|represent*|connect*|relates|reminds`), 3)],
    B2: [st("develop your ideas and opinions in conversation", "Give opinions with reasons and examples.", B_MESSAGE)],
    C: [st("keep the conversation going", "Respond to questions fully and add your own points.", j(r`question*|ask*|answer*|respon*`, r`i agree|i disagree|i see your point|you're right|exactly|actually`, r`what do you|do you think|how about|could you|i mean|let me`, r`opinion|i think|i believe|in my view`), 3)],
  },
  "DP Individuals and societies assessment objectives": {
    A: [
      st("use subject terminology accurately", "Use the subject's precise terms and define the key ones.", HUM_TERMS, 6),
      st("show detailed knowledge with examples and case studies", "Support each point with specific knowledge: names, dates, figures, case studies.", j(EXAMPLE + r`|case study|in the case of`, YEAR, STAT, r`defin*|refers to|is when|means that`, r`re:[A-Z][a-z]+(?: (?:and|&) [A-Z][a-z]+| et al\.?)?,? \(\d{4}\)`, r`explain*|describ*|` + REASON)),
    ],
    B: [
      st("apply concepts and theories to the question", "Apply a named theory or concept to the specific case in the question.", j(r`appl*|in this case|in the case of|case study|` + EXAMPLE, r`theory|theories|model*|concept*|framework|principle`, r`evidence|data|statistic*|figure*|source*|study|studies`, STAT, SHOWS)),
      st("analyse causes, effects and relationships", "Analyse why things happened and how factors connect, rather than describing them.", CAUSE),
    ],
    C: [
      st("weigh different perspectives and counter-arguments", "Set out opposing views and weigh them against each other.", PERSPECTIVES),
      st("reach a reasoned, substantiated judgement", "End each section, and the essay, with a clear judgement that answers the question.", JUDGEMENT),
    ],
  },
  "DP History IA criteria": {
    A: [
      st("state the question and explain why the sources are relevant", "State your question and why each source is relevant to it.", j(r`question|investigat*|to what extent|how far|why did`, r`source*|document*|book|article|memoir*|speech|diary|letter*|historian*`, r`relevan*|useful|importan*|chosen|selected|provides|insight`), 3),
      st("evaluate each source's origin, purpose and content for value and limitations", "For each source, analyse origin, purpose and content, then its value and limitations.", OPVL, 5),
    ],
    B: [
      st("build a clear, focused argument that answers the question", "Make a clear argument and keep every paragraph tied to the question.", ARGUMENT),
      st("analyse evidence from a range of sources", "Analyse evidence from several sources, saying what each shows.", j(r`evidence|source*|document*|according to|as (?:stated|noted|argued) by|historian*|records|statistics`, YEAR, CITE, r`cause*|led to|resulted in|consequence*|impact*|factor*|significan*`, r`analys*|suggest*|show*|indicat*|reveal*|demonstrat*`, EXAMPLE)),
      st("evaluate different perspectives", "Bring in historians' differing views and evaluate them.", PERSPECTIVES),
      st("reach a conclusion consistent with the evidence", "Finish with a conclusion that follows from your evidence.", JUDGEMENT, 3),
    ],
    C: [
      st("reflect on what the investigation showed you about a historian's methods", "Reflect on the methods you used, as a historian would use them.", j(r`historian*|method*`, LEARNED + r`|i (?:found|became aware)`, r`source*|evidence|archive*|bias*|reliab*|interpretation*|perspective*|selection|translat*`, r`process|investigation|research*`), 3),
      st("discuss the challenges and limitations historians face", "Discuss the challenges historians face, with an example from your own investigation.", j(r`challeng*|difficult*|problem*|limit*|struggle*`, r`bias*|subjectiv*|objectiv*|hindsight|incomplete|conflicting|contradict*|lack of|access|censor*|propaganda`, r`truth|certain*|knowledge|fact*|interpretation*|cannot|can never|impossible`, r`this means|` + EXAMPLE + r`|because|therefore`), 3),
    ],
  },
  "DP Economics IA criteria (one commentary)": {
    A: [st("include and explain relevant, labelled diagrams", "Include a fully labelled diagram and explain what it shows.", j(r`diagram*|figure \d|fig|graph*`, r`curve*|shift*|s1|s2|d1|d2|ad|as|sras|lras|mpc|msc|mpb|msb`, r`axis|axes|price|quantity|p1|p2|q1|q2|pe|qe|label*`, r`equilibrium|surplus|shortage|welfare loss|deadweight|tax|subsidy|ceiling|floor|externalit*`, r`shows|illustrat*|as (?:shown|seen)`))],
    B: [st("use economic terminology accurately", "Use economic terms precisely and define the key ones.", j(r`demand|supply`, r`elasticit*|inelastic|elastic`, r`market*|equilibrium|price mechanism`, r`tax*|subsid*|tariff*|quota*|price (?:ceiling|floor)|minimum wage`, r`externalit*|market failure|welfare|surplus|deadweight|merit good*|demerit good*`, r`inflation|unemployment|gdp|growth|aggregate|fiscal|monetary|interest rate*|exchange rate*|recession`, r`opportunity cost|scarcity|allocat*|efficien*|incentive*|revenue`, r`defin*|refers to|is defined as|is when`), 5)],
    C: [st("apply economic theory to the article and analyse it", "Apply the theory to the article: explain step by step what happens and why.", j(r`article|according to|the (?:government|firm|company|central bank|country)`, r`theory|model|diagram|concept`, r`explain*|this (?:leads|causes|means|shifts)|leading to|causing|consequently|thus|` + REASON, r`increase*|decrease*|rise*|fall*|shift*|higher|lower`, STAT))],
    D: [st("link a key concept to the article", "Name the key concept and explain how the article illustrates it.", j(r`scarcity|choice|efficiency|equity|well-being|sustainability|change|interdependence|intervention`, r`key concept|concept`, r`link*|relate*|connect*|illustrat*|shows|demonstrat*`, r`article|government|policy|market|consumer*|producer*`), 3)],
    E: [st("evaluate with balanced, reasoned judgements", "Evaluate: effects on different stakeholders, short run versus long run, and a final judgement.", j(r`stakeholder*|consumer*|producer*|government|firm*|worker*|households|society|taxpayer*`, r`short[- ]run|short[- ]term|long[- ]run|long[- ]term`, r`advantage*|benefit*|disadvantage*|drawback*|` + CONTRAST, r`assum*|ceteris paribus|depends|magnitude|time lag*|unintended|limitation*|effective*`, r`overall|in conclusion|to conclude|ultimately|on balance|most (?:important|significant|effective)|i (?:believe|think|would argue)|judg*|priorit*`))],
    F: [st("meet the rubric requirements", "Give the article's title, source and date, the syllabus unit and your word count.", j(r`article|title`, r`source|published|news|times|guardian|bbc|reuters|bloomberg|economist`, YEAR, r`word count|words`, r`unit|section|microeconomics|macroeconomics|global economy|international`), 3)],
  },
  "DP Geography IA criteria": {
    A: [st("state a fieldwork question in its geographic context", "State the fieldwork question, the location and the theory behind it.", j(r`fieldwork question|research question|question|aim|investigat*`, r`hypothes*|predict*|expect*`, r`location|located|study area|site*|map|river|town|city|coast|village|cbd|district`, r`syllabus|theory|model|concept|bradshaw|burgess|hoyt|butler|distance decay|geograph*`), 3)],
    B: [st("describe and justify your methods", "Describe each method and sampling technique and justify why you chose it.", j(r`method*|technique*|procedure`, r`sampl*|systematic|random|stratified|transect|site*|interval*`, r`questionnaire*|survey*|interview*|count*|measur*|observ*|record*|tally|bi-?polar|index`, r`equipment|tape|ranging pole|clinometer|flow ?meter|stopwatch|quadrat|gps`, r`justif*|so that|in order to|allowed|ensure*|reduce bias|reliab*|represent*|because`, r`primary|secondary`))],
    C: [st("present and process the information you collected", "Present the data with a range of suitable graphs and maps, and process it statistically.", j(r`table*|graph*|chart*|map*|diagram*|scatter|histogram|choropleth|isoline|radar|kite|annotat*|figure \d`, r`data|result*|collected|recorded|readings|responses`, r`mean|median|mode|average|total|percentage*|range|standard deviation|spearman*|chi|correlation|coefficient|nearest neighbour|statistic*|calculat*`, r`re:\d+(?:\.\d+)?`, r`present*|display*|shows|plotted|represent*`))],
    D: [st("analyse the results in detail", "Analyse trends and anomalies, explain them, and refer to your figures and the theory.", j(r`trend*|pattern*|relationship|correlation|increase*|decrease*|higher|lower|rises|falls|peak*`, r`anomal*|outlier*|exception*|unexpected|does not fit`, r`this is because|explained by|caused by|reason|suggest*|indicat*|` + REASON, r`figure \d|table \d|graph|map|as (?:shown|seen)|site \d`, r`theory|model|hypothes*|expected|predict*|fieldwork question`, r`statistic*|spearman*|significan*|coefficient|confidence|critical value`, r`compar*|whereas|while|in contrast|however|similar*`), 5)],
    E: [st("answer the fieldwork question", "State a conclusion that answers the fieldwork question from your findings.", j(r`conclu*|overall|in summary|to sum up|therefore`, r`hypothes*|fieldwork question|research question|question|aim`, r`support*|accept*|reject*|prove*|confirm*|answer*|partly|largely`, r`finding*|result*|evidence|data|show*`), 3)],
    F: [st("evaluate your methods and suggest improvements", "Evaluate the methods: what limited the data, how it affected results, and realistic improvements.", j(r`evaluat*|limitation*|weakness*|problem*|issue*|error*|bias*|inaccura*|unreliab*|strength*`, r`method*|sampl*|equipment|weather|sample size|subjectiv*`, r`improve*|improvement*|next time|in future|recommend*|extend*|extension|further|larger|more (?:sites|data|time|people|samples|days)`, r`reliab*|valid*|accura*|represent*`, r`this meant|affected|which may|may have|might have|because`))],
    G: [st("meet the formal requirements", "Check the formal requirements: title, contents, numbered figures, references and word count.", j(r`title|contents|table of contents|page`, r`word count|words`, r`figure \d|fig|map \d|table \d|appendix|appendices`, r`bibliograph*|references|sources`, r`introduction|method*|analysis|conclusion|evaluation`), 3)],
  },
  "DP IA criteria (general)": {
    A: [st("state a focused research question and explain the approach", "State a focused research question, why it matters, and the method you used.", j(RQ, r`method*|approach|design|procedure|participants|sample|tool*|framework`), 5)],
    B: [
      st("use subject terminology accurately", "Use the subject's precise terms and define the key ones.", ANY_TERMS, 7),
      st("explain the relevant theories and concepts", "Explain the theory or concept you are using and where it comes from.", j(r`theory|theories|model*|concept*|framework|principle|study|studies`, r`defin*|refers to|is when|states that|according to|proposed`, r`context|background|case|company|organisation|organization|participants|market|industry`, r`explain*|describ*|` + REASON, r`re:[A-Z][a-z]+(?: (?:and|&) [A-Z][a-z]+| et al\.?)?,? \(?\d{4}\)?`)),
    ],
    C: [
      st("analyse your evidence", "Analyse your data or evidence: what it shows and why.", EVIDENCE_ANALYSIS),
      st("evaluate and conclude", "Evaluate strengths and limitations, then reach a conclusion that answers the question.", CRITICAL),
    ],
    D: [st("organise the report with clear sections and references", "Organise the report into clear sections and reference your sources.", j(SECTIONS, SOURCES), 4)],
  },
  "DP Sciences IA criteria": {
    A: [
      st("state a focused research question in its scientific context", "State a focused research question and the background science that explains it.", j(RQ, r`theory|literature|equation|law|principle|according to`, CITE), 4),
      st("explain the methodology: variables, range, repeats and controls", "Explain your variables: what you changed (and the range), what you measured, and how each control was kept constant.", VARIABLES, 5),
      st("describe a method others could repeat", "Describe the method in enough detail to repeat it, including safety, ethical and environmental points.", METHOD),
    ],
    B: [
      st("record data clearly with units and uncertainties", "Record raw data in tables with units and uncertainties, plus qualitative observations.", j(r`table*|raw data|processed`, r`re:±`, r`uncertaint*|precision|significant figure*|decimal place*`, UNITS, r`trial*|repeat*|mean|average|standard deviation|range`, r`qualitative|observ*|colou?r change|noted`)),
      st("process the data correctly", "Show your processing: a sample calculation, a graph with a best-fit line, and propagated uncertainties.", j(r`calculat*|formula|equation|sample calculation|worked example`, EQUALS, r`mean|average|gradient|slope|intercept|rate|percentage*|standard deviation|r²|r\^2|correlation|regression|best[- ]fit|linear*|logarithm*`, r`graph*|plot*|axis|axes|error bar*|curve|trend ?line`, r`propagat*|percentage uncertaint*|absolute uncertaint*|total uncertaint*`, r`anomal*|outlier*|excluded`)),
    ],
    C: [
      st("answer the research question from your data", "State a conclusion that answers the research question, quoting your processed data.", j(r`conclu*|therefore|overall|in summary|research question|answer*`, r`data|result*|graph|gradient|trend|value|as (?:shown|seen)`, r`increase*|decrease*|proportional|linear|exponential|positive|negative|correlation|relationship`, r`support*|confirm*|consistent|agree*|hypothes*|predict*`, UNITS)),
      st("justify it with science and compare with accepted values", "Explain the result scientifically and compare it with a literature or accepted value.", j(r`literature|accepted|theoretical|expected|published|textbook|known value|data ?book|according to`, CITE, r`percentage (?:error|difference)|differs|deviat*|compar*|agree*|close to|higher than|lower than`, r`this is because|explained by|` + REASON, SCI_TERMS), 3),
    ],
    D: [
      st("identify weaknesses and limitations and how much they mattered", "Identify specific weaknesses (systematic and random), and say how each affected the result.", METHOD_EVAL, 5),
      st("suggest realistic, specific improvements", "Suggest a realistic improvement for each weakness, and an extension.", SCI_IMPROVE),
    ],
  },
  "DP Sciences assessment objectives": {
    A: [
      st("explain scientific knowledge", "Explain the underlying science precisely, using the correct terms.", SCI_EXPLAIN, 6),
      st("define terms and describe processes accurately", "Define the key terms and describe each process step by step.", j(r`defin*|refers to|is when|known as|called`, SCI_TERMS, r`describ*|state*|outline*|structure*|function*|process*|stage*`, EXAMPLE), 3),
    ],
    B: [st("apply the science to the situation in the question", "Apply the science to this specific situation: calculate, predict and explain.", SCI_APPLY)],
    C: [st("analyse data and evaluate claims", "Analyse the data or argument, evaluate its limits and reach a conclusion.", j(r`data|graph|table|result*|trend*|pattern*|correlation|relationship|increase*|decrease*|proportional`, r`analys*|interpret*|show*|suggest*|indicat*|deduc*|infer*`, r`evaluat*|limitation*|uncertaint*|error*|reliab*|valid*|strength*|weakness*|assum*|` + CONTRAST, r`conclu*|therefore|hence|thus|overall|support*|hypothes*`, r`compar*|advantage*|disadvantage*|difference|better|worse|more effective|less effective`, r`this is why|because|due to|as a result|so that|which means`), 5)],
    D: [st("communicate with correct units, symbols and labels", "Give units with every value and use correct symbols and labels.", j(UNITS, r`equation|formula`, EQUALS, r`label*|diagram*|graph*|table*|figure`, r`term*|notation|symbol*|significant figure*|units`), 2)],
  },
  "DP Mathematics IA criteria": {
    A: [st("organise the exploration with an aim, clear sections and a conclusion", "Give the exploration a stated aim, clear sections and a conclusion that returns to the aim.", j(r`aim|introduction|rationale|objective`, r`conclusion|conclude|in summary|overall|summary`, r`section|part \d|firstly|next|then|finally|in this (?:exploration|section|investigation)`, r`graph*|table*|diagram*|figure \d`), 3)],
    B: [st("use correct notation, defined terms and varied representations", "Define your variables and key terms, use correct notation, and use graphs or tables.", j(MATH_NOTATION, MATH_REPRESENT), 4)],
    C: [st("show personal engagement", "Make it your own: explain why you chose the topic and where you made your own decisions or collected your own data.", j(r`i (?:chose|decided|wondered|noticed|realis(?:e|ed)|realiz(?:e|ed)|wanted|became|was curious|have always|was surprised|tried|created|collected|designed|expected|measured|tested|compared|found|bought|weighed)`, r`interest*|curious*|fascinat*|passion*|hobby|personal*|enjoy*|surpris*|at home|everyday|real (?:data|cans|life)`, r`my (?:own|data|model|idea|approach|question|conjecture|example|method|experience|team|family|school|aim|kitchen|measurements|results)`, r`what if|i wonder*|why does|how could|decided to (?:test|try|extend|change|collect|model)`), 3)],
    D: [st("reflect critically on the results and methods", "Reflect on what your results mean, the limits of your model, and how you could extend it.", j(r`reflect*|looking back|in hindsight|on reflection`, r`limitation*|weakness*|assum*|inaccura*|error*|does not (?:account|consider|include)|ignores|simplif*|unrealistic`, r`implication*|means that|significan*|suggests|interpret*|in (?:context|reality|real life)|makes sense|reasonable`, r`extend*|extension|further|improve*|alternative*|another (?:model|method|approach)`, r`compar*|accura*|valid*|reliab*|surpris*|expected|unexpected|however`))],
    E: [
      st("use relevant mathematics at the level of the course", "Use mathematics from the course at a suitable level, and name the methods you use.", j(MATH_TOPICS, r`model*`), 4),
      st("show correct, complete working", "Show complete working, and check results with technology or a second method.", j(MATH_WORK, r`check*|verif*|confirm*|using (?:technology|a gdc|desmos|geogebra|excel)|gdc|r²|r\^2|residual*`)),
    ],
  },
  "DP Mathematics assessment objectives": {
    A: [
      st("select the right mathematics", "State which result, formula or method you are using.", MATH_SELECT, 3),
      st("apply it and show your working", "Show every step of your working.", MATH_WORK),
    ],
    B: [st("choose a strategy and carry it through to a solution", "Set out your strategy, define unknowns and follow it through to a final answer.", j(MATH_SELECT, MATH_WORK, MATH_ANSWER), 6)],
    C: [st("communicate with correct notation and interpret results in context", "Use correct notation and say what each result means in context, with units.", j(MATH_NOTATION, MATH_REPRESENT, r`interpret*|in context|means that|represents|units`), 4)],
    D: [st("justify each step with clear reasoning", "Justify your steps and conclusions (\"therefore\", \"since\", \"this shows that\").", MATH_REASON, 3)],
  },
  "DP arts assessment objectives": {
    A: [
      st("investigate artists, movements and their contexts", "Investigate the artists and movements that inform your work and the contexts they come from.", ART_MOVEMENT, 5),
      st("analyse specific works", "Analyse specific named works: how they are made and the effect they have.", ART_CRITIQUE, 5),
    ],
    B: [
      st("develop ideas and skills through experimentation", "Show how your ideas and skills developed through experiments and refinement.", ART_EXPLORE, 5),
      st("communicate clear intentions", "State your intentions for the work and for its audience.", ART_INTENT),
    ],
    C: [st("describe how you created and presented the work", "Describe how you made and presented the work, and the choices you made.", ART_MAKE)],
    D: [
      st("evaluate your own work against your intentions", "Evaluate the work against your intentions: strengths, weaknesses and how the audience responds.", ART_APPRAISE, 7),
      st("reflect on your development as an artist", "Reflect on how your practice has developed and where it goes next.", ART_GROWTH, 5),
    ],
  },
  "DP Extended Essay criteria": {
    A: [
      st("state a focused research question and explain its purpose", "State the research question early and explain why it is worth answering.", RQ, 3),
      st("explain and justify your sources and method", "Explain which sources or methods you chose and why they suit the question.", j(r`method*|approach|design|framework`, r`source*|primary|secondary|literature|scholar*|journal*|experiment*|survey*|interview*|archive*`, r`selected|chosen|chose|range|variety|appropriate|suitable|justif*|allow*`, r`reliab*|relevan*|limit*|scope`), 3),
    ],
    B: [
      st("place the topic in its academic context", "Place the topic in its academic context: the key theories, scholars and debates.", j(r`context|background|literature|scholar*|academic|theorist*|debate*|field|research (?:has|shows)|studies|critic*`, CITE, r`according to|argues|proposed|suggests that|notes that|describes`, r`theory|theories|concept*|principle*|model*|framework`, r`histor*|origin*|century|published|written in|set in|period|era`, YEAR)),
      st("use subject terminology and concepts accurately", "Use the subject's terminology precisely and define key concepts.", ANY_TERMS, 7),
    ],
    C: [
      st("analyse your research and evidence", "Analyse your evidence: what it shows and how it bears on the question.", EVIDENCE_ANALYSIS),
      st("build a reasoned argument from the evidence", "Build the argument step by step, each claim resting on evidence.", ARGUMENT),
      st("evaluate your evidence and argument critically", "Evaluate critically: counter-arguments, the limits of your sources, and how far your conclusion holds.", CRITICAL, 5),
    ],
    D: [st("meet the formal presentation requirements", "Check the presentation: contents page, headed sections, numbered figures and a consistent bibliography.", j(r`contents|table of contents|title page|page`, r`introduction|conclusion|chapter*|section*|heading*`, r`bibliograph*|works cited|references|footnote*`, CITE, r`figure \d|table \d|fig|appendix|appendices|word count`), 3)],
    E: [
      st("reflect on your decisions and how your approach changed", "Reflect on the decisions you made and how your approach changed along the way.", j(r`i (?:decided|chose|changed|planned|narrowed|refined|adapted|reconsidered|struggled|began|initially|originally)|my (?:approach|plan|question|supervisor|initial|first)`, r`reflect*|looking back|in hindsight`, r`challeng*|difficult*|problem*|setback*|obstacle*|overcame`, r`decision*|chang*|refin*|narrow*|adjust*|alternative*|instead`, r`this meant|which led|` + REASON)),
      st("show what you learned and your own initiative", "Say what you learned as a researcher and what you would do differently.", j(LEARNED + r`|i (?:gained|developed|improved|became)`, r`skill*|time management|critical*|independen*|confiden*|understanding|perspective`, r`surpris*|fascinat*|interest*|curious*|motivat*|enjoy*`, r`would (?:do|change|start|approach)|differently|if i (?:were|did|had)|` + FUTURE, r`further|new (?:question|idea|direction)|beyond|initiative`)),
    ],
  },
  "DP TOK essay criteria": {
    A: [
      st("keep a sustained focus on the title and on knowledge", "Keep every paragraph on the title and on knowledge: how we know, not just what happened.", j(r`knowledge|knowing|knower*`, r`title|prescribed|claim*`, r`area* of knowledge|aok*|natural sciences|human sciences|history|the arts|mathematics`, r`truth|certain*|belief*|justif*|evidence|reliab*|objectiv*|subjectiv*|bias*|interpretation*`, r`values|culture|language|reason|emotion|intuition|imagination|faith|memory|method*|paradigm*`, r`to what extent|how do we know|what counts as`), 5),
      st("support arguments with specific real examples", "Support each argument with a specific real example and explain what it shows about knowledge.", j(EXAMPLE + r`|consider|take the case|an example|illustrat*`, YEAR, r`experiment*|study|studies|discovery|scientist*|historian*|artist*|mathematician*|economist*|theorem|paradox`, r`in (?:biology|physics|chemistry|history|economics|psychology|mathematics|art|music|literature)`, r`my own|personal*|in my (?:experience|class|school)|when i`), 3),
      st("consider different perspectives and counterclaims", "Set a counterclaim against each claim and consider another perspective.", j(r`counter-?claim*|counter-?argument*`, PERSPECTIVES)),
      st("draw out implications and reach a conclusion", "Draw out the implications (\"so what?\") and finish with a nuanced conclusion.", j(r`impl*|consequence*|it follows|significan*|matters because`, r`therefore|thus|hence|in conclusion|to conclude|ultimately|overall`, r`depends|to (?:a|some|a large|a certain) extent|not always|in some cases|nuance*|balance*`, r`evaluat*|weigh*|strength*|weakness*|limitation*|convinc*|valid*`), 3),
    ],
  },
}

/** How common each cue is: the share of sections, across all the blind samples, in which it appears (see blind.test.ts). */
const frequency = cueWeights as Record<string, number>

const compile = (alt: string) => {
  if (alt.startsWith("cs:")) return new RegExp(alt.slice(3), "gm")
  return alt.startsWith("re:") ? new RegExp(alt.slice(3), "gim") : new RegExp(`\\b(?:${alt.replace(/\*/g, "\\w*").replace(/ /g, "\\s+")})\\b`, "gi")
}
const compiled = new WeakMap<Strand, { alt: string; re: RegExp; common: number }[]>()
function patterns(strand: Strand) {
  let res = compiled.get(strand)
  if (!res) {
    res = strand.cues.split(/,\s+/).map((raw) => ({ alt: raw.trim(), re: compile(raw.trim()), common: frequency[raw.trim()] ?? 0 }))
    compiled.set(strand, res)
  }
  return res
}
/** Every cue in every strand, for measuring how common each one is. */
export const allCues = () => [...new Set(Object.values(STRANDS).flatMap((rubric) => Object.values(rubric).flatMap((strands) => strands.flatMap((s) => patterns(s).map((p) => p.alt)))))].map((alt) => ({ alt, re: compile(alt) }))

/** Calibration constants, fitted to the blind samples in ./samples (see blind.test.ts). */
export const TUNE = {
  /** Multiplies each strand's `need`: how many different cues make it fully shown. */
  breadth: 1,
  /** Share of a strand's score that comes from breadth; the rest from cues recurring. */
  breadthShare: 0.85,
  /** Occurrences per needed cue for a strand to count as sustained. */
  sustain: 4,
  /** Exponent on strand coverage: above 1, partly shown strands count for less. */
  power: 1,
  /** Share of a content mark that coverage earns before development (reasons, specifics) is counted. */
  devFloor: 0.2,
  /** Mark kept by very short work, and the share of the expected length that earns full marks. */
  lengthFloor: 0.6,
  lengthFull: 0.6,
  /** Share of "development" judged from the sophistication of the writing, not reasons and specifics. */
  langShare: 1,
  /** Final stretch of the scale: mark = gain × raw − offset. */
  gain: 1.15,
  offset: 0,
  /** Long work is judged in sections of about this many words, so stray words across a long piece don't add up to a strand. */
  window: 250,
  /** Share of sections (the best ones) a strand is mainly judged on, and the weight given to all sections. */
  top: 0.34,
  spread: 0.3,
  /** How strongly a cue that appears in every kind of work ("because", "result") is discounted: weight = (1 − frequency)^rare. */
  rare: 1,
  /** Share of the language mark that comes from the sophistication of the writing (academic words, linked clauses, few vague words). */
  soph: 0,
}

let sectioned: { key: string; sections: string[] } | undefined
/** The work cut into sections of about TUNE.window words, on line and sentence breaks. */
export function sections(text: string) {
  const key = `${TUNE.window}:${text}`
  if (sectioned?.key === key) return sectioned.sections
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length
  // A very long line (a pasted paragraph) is cut into sentences first.
  const units = text.split("\n").flatMap((line) => (count(line) > TUNE.window ? line.split(/(?<=[.!?])\s+/) : [line]))
  const out: string[] = []
  let cur: string[] = []
  let n = 0
  for (const unit of units) {
    cur.push(unit)
    n += count(unit)
    if (n >= TUNE.window) {
      out.push(cur.join("\n"))
      cur = []
      n = 0
    }
  }
  // A short tail joins the previous section so it isn't judged on a few words.
  if (n && out.length && n < TUNE.window / 2) out[out.length - 1] += `\n${cur.join("\n")}`
  else if (n) out.push(cur.join("\n"))
  sectioned = { key, sections: out }
  return out
}

/**
 * How clearly a strand shows in the work, 0–1. Within a section: how many different cues appear (breadth)
 * and whether they recur. Across the work: mainly the best sections, partly all of them.
 */
export function strandDetail(strand: Strand, text: string) {
  const pats = patterns(strand)
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const weights = pats.map((p) => Math.max(0.05, 1 - p.common) ** TUNE.rare)
  const need = Math.min(strand.need * TUNE.breadth, pats.length) * mean(weights)
  const scores = sections(text)
    .map((section) => {
      let hits = 0
      let total = 0
      pats.forEach((p, i) => {
        const n = section.match(p.re)?.length ?? 0
        if (n) hits += weights[i]
        total += Math.min(n, 4) * weights[i]
      })
      return TUNE.breadthShare * Math.min(1, hits / need) + (1 - TUNE.breadthShare) * Math.min(1, total / (need * TUNE.sustain))
    })
    .sort((a, b) => b - a)
  if (!scores.length) return { top: 0, all: 0, best: 0, shown: 0 }
  return {
    /** The best sections. */
    top: mean(scores.slice(0, Math.max(1, Math.ceil(scores.length * TUNE.top)))),
    all: mean(scores),
    best: scores[0],
    /** Share of sections where the strand shows at least half-way. */
    shown: scores.filter((x) => x >= 0.5).length / scores.length,
  }
}
