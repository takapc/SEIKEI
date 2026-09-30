param(
  [string]$CandidatePath = (Join-Path $HOME 'Downloads/civics_events_candidates_v1.json')
)

$ErrorActionPreference = 'Stop'
$candidatePath = $CandidatePath
$candidate = Get-Content -Raw -LiteralPath $candidatePath | ConvertFrom-Json
$sources = [ordered]@{
  uk = 'https://www.parliament.uk/about/living-heritage/evolutionofparliament/2015-parliament-in-the-making/get-involved1/2015-parliament-in-the-making-events/magna-carta--parliament-exhibition/'
  ukRights = 'https://www.parliament.uk/about/living-heritage/evolutionofparliament/parliamentaryauthority/revolution/collections1/collections-glorious-revolution/billofrights/'
  usDeclaration = 'https://www.archives.gov/founding-docs/declaration-history'
  usConstitution = 'https://www.archives.gov/milestone-documents/constitution'
  ndlConstitution = 'https://www.ndl.go.jp/constitution/etc/history.html'
  ndlElection = 'https://www.ndl.go.jp/constitution/gaisetsu/04gaisetsu.html'
  ndlDiet = 'https://www.ndl.go.jp/constitution/gaisetsu/05gaisetsu.html'
  election = 'https://www.shugiin.go.jp/internet/itdb_kenpou.nsf/html/kenpou/shukenshi092.pdf/$File/shukenshi092.pdf'
  local = 'https://www.archives.go.jp/ayumi/kobetsu/s22_1947_04.html'
  decentral = 'https://www.cao.go.jp/bunken-suishin/doc/kaigi05shiryou11.pdf'
  unHistory = 'https://www.un.org/en/about-us/history-of-the-un'
  unJapan = 'https://www.mofa.go.jp/mofaj/fp/un/70th.html'
  udhr = 'https://www.un.org/en/about-us/udhr/history-of-the-declaration'
  unTreaties = 'https://www.un.org/womenwatch/daw/cedaw/cedaw20/history.htm'
  crc = 'https://treaties.un.org/pages/showmtdsgdetails.aspx?chapter=4&lang=en&mtdsg_no=iv-11&src=untsonline&tabid=2'
  sdgs = 'https://www.un.org/pga/wp-content/uploads/sites/3/2015/08/120815_outcome-document-of-Summit-for-adoption-of-the-post-2015-development-agenda.pdf'
  imf = 'https://www.imf.org/external/about/timeline/index.htm'
  fed = 'https://www.federalreservehistory.org/essays/great-recession-and-its-aftermath'
  ilo = 'https://www.ilo.org/about-ilo/history-ilo'
  iloDeclaration = 'https://www.ilo.org/resource/news/declaration-philadelphia-75-years'
  equalWork = 'https://www.check-roudou.mhlw.go.jp/study/roudousya_joseisuishin.html'
  bojHistory = 'https://www.boj.or.jp/about/outline/history/his_1850.htm'
  bojPolicy = 'https://www.boj.or.jp/mopo/outline/bpreview/ref.htm'
  bojQQE = 'https://www.boj.or.jp/en/mopo/outline/ref_qqe.htm'
  tax = 'https://www.nta.go.jp/taxes/kids/hatten/page16.htm'
  invoice = 'https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm'
  welfare = 'https://www.mhlw.go.jp/stf/web_magazine/closeup/24.html'
  care = 'https://kouseikyoku.mhlw.go.jp/chugokushikoku/chiikihoukatsusuishin/000212656.pdf'
  meti = 'https://www.meti.go.jp/statistics/toppage/topics/maruwakari/nenpyo.html'
  economy = 'https://www.archives.go.jp/learning/archive_collection_8/collection_1/'
  expo = 'https://www.archives.go.jp/exhibition/digital/high-growth/history.html'
  wto = 'https://www.wto.org/english/thewto_e/25y_e/25ytimeline_e.htm'
  gatt = 'https://www.wto.org/english/tratop_e/gatt_e/task_of_signing_e.htm'
  gatt1948 = 'https://www.wto.org/english/docs_e/legal_e/legalexplgatt1947_e.htm'
  env = 'https://www.env.go.jp/publication/history/50th/index.html'
  envLaw = 'https://www.env.go.jp/council/content/i_01/000123093.pdf'
  kyoto = 'https://unfccc.int/files/press/backgrounders/application/pdf/fact_sheet_the_kyoto_protocol.pdf'
  paris = 'https://unfccc.int/process-and-meetings/the-paris-agreement'
  nagoya = 'https://www.cbd.int/abs/nagoya-protocol/signatories'
  frenchRights = 'https://www.elysee.fr/la-presidence/la-declaration-des-droits-de-l-homme-et-du-citoyen'
  meiji = 'https://www.archives.go.jp/hub/meiji/'
  meijiEnforce = 'https://www.archives.go.jp/ayumi/kobetsu/m23_1890_03.html'
  weimar = 'https://weimar.bundesarchiv.de/WEIMAR/DE/Content/Dokumente-zur-Zeitgeschichte/1919-08-11_Verfassung.html'
  league = 'https://www.ndl.go.jp/modern/utility/chronology.html'
  depression = 'https://www.federalreservehistory.org/essays/great-depression'
  antitrust = 'https://www.archives.go.jp/ayumi/kobetsu/s22_1947_03.html'
  nato = 'https://www.nato.int/en/about-us/organization/founding-treaty'
  korea = 'https://history.state.gov/milestones/1945-1952/korean-war'
  sf = 'https://www.mofa.go.jp/mofaj/ms/da/page24_001795.html'
  sfEffective = 'https://www.mofa.go.jp/mofaj/press/pr/pub/pamph/pdfs/ju150.pdf'
  sdf = 'https://www.mod.go.jp/gsdf/about/history/index.html'
  ldp = 'https://www.ndl.go.jp/modern/cha6/'
  rome = 'https://www.europarl.europa.eu/about-parliament/en/in-the-past/the-parliament-and-the-treaties/treaty-of-rome'
  newSecurity = 'https://www.mofa.go.jp/na/st/page1we_000093.html'
  cuba = 'https://history.state.gov/milestones/1961-1968/cuban-missile-crisis'
  okinawa = 'https://www.mofa.go.jp/mofaj/annai/honsho/shiryo/page24_001761.html'
  china = 'https://www.mofa.go.jp/mofaj/ms/da/page24_001940.html'
  oil = 'https://www.enecho.meti.go.jp/about/special/tokushu/anzenhosho/kasekinenryo.html'
  float = 'https://www.imes.boj.or.jp/research/papers/japanese/kk5-4-6.pdf'
  plaza = 'https://www.elibrary.imf.org/display/book/9781616351991/ch001.xml'
  berlin = 'https://www.bundesregierung.de/breg-de/schwerpunkte/deutsche-einheit/chronik-der-ereignisse-1989-1990'
  soviet = 'https://history.state.gov/milestones/1989-1992/collapse-soviet-union'
  pko = 'https://www.mod.go.jp/gsdf/about/pko/'
  eu = 'https://european-union.europa.eu/principles-countries-history/history-eu/1990-99_en'
  crcJapan = 'https://www.mofa.go.jp/mofaj/gaiko/jido/seka.html'
  ctbt = 'https://legal.un.org/avl/ha/ctbt/ctbt.html'
  asian = 'https://www.imf.org/en/Blogs/Articles/2017/07/13/what-we-have-seen-and-learned-20-years-after-the-asian-financial-crisis'
  euro = 'https://european-union.europa.eu/institutions-law-budget/euro/history-and-purpose_en'
  quake = 'https://www.reconstruction.go.jp/english/topics/GEJE/'
  defenseMinistry = 'https://www.nids.mod.go.jp/publication/kiyo/pdf/bulletin_j10_2_4.pdf'
  postal = 'https://www.jp-bank.japanpost.jp/aboutus/press/2007/abt_prs_id000161.html'
  immigration = 'https://www.moj.go.jp/isa/publications/publications/missions.html'
}

# Each line is an individually checked candidate: exact title | evidence | additional categories.
$selected = @'
マグナ・カルタの承認|uk|
フランス人権宣言の採択|frenchRights|
権利請願の成立|uk|
人身保護法の成立|uk|
イギリス権利章典の成立|ukRights|
アメリカ独立宣言の採択|usDeclaration|
アメリカ合衆国憲法の制定|usConstitution|
大日本帝国憲法の発布|meiji|
大日本帝国憲法の施行|meijiEnforce|
ワイマール憲法の制定|weimar|
国際連盟の発足|league|
世界恐慌の始まり|depression|
ポツダム宣言の発表|ndlConstitution|
GHQ草案の提示|ndlConstitution|
日本国憲法の公布|ndlConstitution|
日本国憲法の施行|ndlConstitution|
世界人権宣言の採択|udhr|
国際人権規約（社会権規約）の採択|unTreaties|
国際人権規約（自由権規約）の採択|unTreaties|
女子差別撤廃条約の採択|unTreaties|
子どもの権利条約の採択|crc|
女性が初めて参加した衆議院総選挙|ndlElection|選挙・政党
第1回参議院議員通常選挙|ndlDiet|
地方自治法の施行|local|
地方分権一括法の施行と機関委任事務の廃止|decentral|
普通選挙法の成立（男子普通選挙）|election|
女性参政権を認める衆議院議員選挙法改正|election|国会・内閣・司法
選挙権年齢を18歳に引き下げる改正法の成立|election|
18歳選挙権で初の国政選挙|election|
国際連合の発足|unHistory|
独占禁止法の制定|antitrust|経済理論・市場
北大西洋条約機構（NATO）の発足|nato|
朝鮮戦争の勃発|korea|
サンフランシスコ平和条約の調印|sf|
旧日米安全保障条約の調印|sf|
サンフランシスコ平和条約の発効と日本の主権回復|sfEffective|
自衛隊の発足|sdf|
自由民主党の結成と55年体制の成立|ldp|選挙・政党
ローマ条約の調印|rome|
新日米安全保障条約の調印|newSecurity|
キューバ危機|cuba|
沖縄の日本復帰|okinawa|
日中共同声明の発表と国交正常化|china|
第一次石油危機|oil|企業・労働,国際経済
日本の変動相場制への移行|float|国際経済,経済理論・市場
日中平和友好条約の調印|china|
プラザ合意|plaza|日本経済史,国際経済
ベルリンの壁の開放|berlin|
ドイツ統一|berlin|
ソビエト連邦の解体|soviet|
国連平和維持活動（PKO）協力法の成立|pko|
マーストリヒト条約の調印|eu|
欧州連合（EU）の発足|eu|国際経済
日本による子どもの権利条約の批准|crcJapan|
包括的核実験禁止条約（CTBT）の採択|ctbt|
アジア通貨危機の発生|asian|日本経済史
ユーロの導入（電子決済）|euro|金融
ユーロ紙幣・硬貨の流通開始|euro|金融
東日本大震災|quake|地方自治,環境・人口・現代社会
日本の国際連合加盟|unJapan|
持続可能な開発目標（SDGs）の採択|sdgs|環境・人口・現代社会
ブレトンウッズ会議|imf|金融
ニクソン・ショック（金とドルの交換停止）|imf|金融,国際経済
リーマン・ショック|fed|日本経済史,国際経済
国際労働機関（ILO）の設立|ilo|
ILOフィラデルフィア宣言の採択|iloDeclaration|
男女雇用機会均等法の成立|equalWork|
男女雇用機会均等法の施行|equalWork|
日本銀行の開業|bojHistory|
日本銀行の量的緩和政策導入|bojPolicy|
日本銀行の量的・質的金融緩和導入|bojQQE|
消費税（税率3％）の導入|tax|
消費税率を5％に引き上げ|tax|
消費税率を8％に引き上げ|tax|
消費税率を10％に引き上げ|tax|
インボイス制度の開始|invoice|
国民皆保険・皆年金の実現|welfare|
介護保険法の成立|care|
介護保険制度の開始|care|
経済白書で「もはや戦後ではない」と記述|meti|
国民所得倍増計画の閣議決定|economy|
大阪万国博覧会の開催|expo|
関税及び貿易に関する一般協定（GATT）の署名|gatt|
GATTの暫定適用開始|gatt1948|
WTO設立協定の調印|wto|
世界貿易機関（WTO）の発足|wto|
公害対策基本法の成立|envLaw|
環境庁の発足|env|
環境基本法の成立|envLaw|
京都議定書の採択|kyoto|
京都議定書の発効|kyoto|
パリ協定の採択|paris|
パリ協定の発効|paris|
生物多様性条約の名古屋議定書の採択|nagoya|
'@ -split "`n" | Where-Object { $_.Trim() }

# 4=最優先、3=必須、2=標準、1=補強。旧3の難しい項目は2または1へ移した。
$importanceOverrides = @{
  'アメリカ独立宣言の採択' = 4
  '日本国憲法の公布' = 4
  '日本国憲法の施行' = 4
  '世界人権宣言の採択' = 4
  '普通選挙法の成立（男子普通選挙）' = 4
  '女性参政権を認める衆議院議員選挙法改正' = 4
  '国際連合の発足' = 4
  '持続可能な開発目標（SDGs）の採択' = 4
  'ニクソン・ショック（金とドルの交換停止）' = 4
  'リーマン・ショック' = 4
  '消費税（税率3％）の導入' = 4
  '国民皆保険・皆年金の実現' = 4
  '介護保険制度の開始' = 4
  '国民所得倍増計画の閣議決定' = 4
  '世界貿易機関（WTO）の発足' = 4
  '京都議定書の採択' = 4
  'パリ協定の採択' = 4
  '国際人権規約（社会権規約）の採択' = 2
  '国際人権規約（自由権規約）の採択' = 2
  '女子差別撤廃条約の採択' = 2
  '地方分権一括法の施行と機関委任事務の廃止' = 1
  '18歳選挙権で初の国政選挙' = 2
  'ブレトンウッズ会議' = 2
  '国際労働機関（ILO）の設立' = 2
  '男女雇用機会均等法の施行' = 2
  '関税及び貿易に関する一般協定（GATT）の署名' = 2
  '環境基本法の成立' = 2
  'ILOフィラデルフィア宣言の採択' = 1
  '日本銀行の量的緩和政策導入' = 1
  '日本銀行の量的・質的金融緩和導入' = 1
  'GATTの暫定適用開始' = 1
  'WTO設立協定の調印' = 1
  'フランス人権宣言の採択' = 4
  '大日本帝国憲法の発布' = 3
  '大日本帝国憲法の施行' = 2
  'ワイマール憲法の制定' = 3
  '国際連盟の発足' = 3
  '世界恐慌の始まり' = 4
  '独占禁止法の制定' = 2
  '北大西洋条約機構（NATO）の発足' = 3
  '朝鮮戦争の勃発' = 3
  'サンフランシスコ平和条約の調印' = 4
  '旧日米安全保障条約の調印' = 2
  'サンフランシスコ平和条約の発効と日本の主権回復' = 2
  '自衛隊の発足' = 3
  '自由民主党の結成と55年体制の成立' = 3
  'ローマ条約の調印' = 2
  '新日米安全保障条約の調印' = 3
  'キューバ危機' = 2
  '沖縄の日本復帰' = 3
  '日中共同声明の発表と国交正常化' = 3
  '第一次石油危機' = 4
  '日本の変動相場制への移行' = 2
  '日中平和友好条約の調印' = 2
  'プラザ合意' = 3
  'ベルリンの壁の開放' = 3
  'ドイツ統一' = 2
  'ソビエト連邦の解体' = 3
  '国連平和維持活動（PKO）協力法の成立' = 2
  'マーストリヒト条約の調印' = 2
  '欧州連合（EU）の発足' = 3
  '日本による子どもの権利条約の批准' = 2
  '包括的核実験禁止条約（CTBT）の採択' = 2
  'アジア通貨危機の発生' = 2
  'ユーロの導入（電子決済）' = 2
  'ユーロ紙幣・硬貨の流通開始' = 2
  '東日本大震災' = 3
}

$events = foreach ($line in $selected) {
  $parts = $line.Trim() -split '\|', 3
  $candidateEvent = @($candidate.events | Where-Object title -eq $parts[0])
  if ($candidateEvent.Count -ne 1) { throw "Expected one candidate for $($parts[0]); got $($candidateEvent.Count)" }
  $entry = $candidateEvent[0]
  $displayTitle = if ($entry.title -eq 'アメリカ合衆国憲法の制定') { 'アメリカ合衆国憲法への署名' } else { $entry.title }
  $displayDateType = if ($entry.title -eq 'アメリカ合衆国憲法の制定') { '署名' } else { $entry.dateType }
  $categories = @($entry.category)
  if ($parts[2]) { $categories += $parts[2] -split ',' }
  [ordered]@{
    id = $entry.id
    title = $displayTitle
    year = $entry.year
    dateType = $displayDateType
    categories = $categories
    importance = if ($importanceOverrides.ContainsKey($entry.title)) { $importanceOverrides[$entry.title] } else { $entry.importance }
    sourceUrl = $sources[$parts[1]]
  }
}
$linkedSourceKeys = @('frenchRights','meiji','meijiEnforce','weimar','league','depression','antitrust','nato','korea','sf','sfEffective','sdf','ldp','rome','newSecurity','cuba','okinawa','china','oil','float','plaza','berlin','soviet','pko','eu','crcJapan','ctbt','asian','euro','quake')
$newCandidateTitles = @($selected | ForEach-Object { $parts = $_.Trim() -split '\|', 3; if ($parts[1] -in $linkedSourceKeys) { $parts[0] } })
$extraEvents = @(
  [ordered]@{ id='ext-defense-ministry-2007'; title='防衛省の発足'; year=2007; dateType='発足'; categories=@('国会・内閣・司法','国際政治'); importance=2; sourceUrl=$sources.defenseMinistry }
  [ordered]@{ id='ext-postal-privatization-2007'; title='郵政民営化の実施'; year=2007; dateType='実施'; categories=@('日本経済史','金融'); importance=2; sourceUrl=$sources.postal }
  [ordered]@{ id='ext-immigration-agency-2019'; title='出入国在留管理庁の発足'; year=2019; dateType='発足'; categories=@('国会・内閣・司法'); importance=1; sourceUrl=$sources.immigration }
)
$events = @($events) + $extraEvents
$usedIds = @($events | ForEach-Object id)
$levelChanges = @($events | ForEach-Object {
  $published = $_
  $original = $candidate.events | Where-Object id -eq $published.id | Select-Object -First 1
  if ($original -and $published.importance -ne $original.importance) {
    [ordered]@{ id=$published.id; title=$published.title; from=$original.importance; to=$published.importance }
  }
})
$mergedTitles = @{
  '衆議院議員選挙法の改正で女性参政権を導入' = '女性参政権を認める衆議院議員選挙法改正'
  '米国がドルと金の交換停止を発表' = 'ニクソン・ショック（金とドルの交換停止）'
  'ニクソン・ショック' = 'ニクソン・ショック（金とドルの交換停止）'
  '消費税率の5％への引上げ' = '消費税率を5％に引き上げ'
  'リーマン・ショックと世界金融危機' = 'リーマン・ショック'
  '自由民主党の結成' = '自由民主党の結成と55年体制の成立'
  '第一次石油危機と雇用調整' = '第一次石油危機'
  'プラザ合意と急速な円高' = 'プラザ合意'
  'アジア通貨危機' = 'アジア通貨危機の発生'
  '東日本大震災と自治体の広域支援' = '東日本大震災'
}
$excluded = @($candidate.events | Where-Object { $_.id -notin $usedIds } | ForEach-Object {
  $reason = if ($mergedTitles.ContainsKey($_.title)) { "同一事象のカード『$($mergedTitles[$_.title])』に統合。" } else { '個別の一次資料による名称・年・出来事の意味の照合を完了できていないため保留。' }
  [ordered]@{ id = $_.id; title = $_.title; year = $_.year; reason = $reason }
})
$out = [ordered]@{ version='1.0'; categories=$candidate.categories; events=@($events) }
$audit = [ordered]@{
  candidateCount = $candidate.events.Count
  includedCount = $events.Count
  excludedCount = $excluded.Count
  addedFromLinkedReferences = @($events | Where-Object { $_.title -in $newCandidateTitles -or $_.id -like 'ext-*' } | ForEach-Object { [ordered]@{id=$_.id; title=$_.title; year=$_.year; sourceUrl=$_.sourceUrl} })
  linkedReferences = @(
    'https://quizlet.com/jp/868871709/政治経済覚えるべき年号-flash-cards/'
    'https://www.takeda.tv/sugamo/blog/post-211188/'
    'https://note.com/study12345/n/n384d878c2f2c'
    'https://ankilot.com/view/?id=5NkJia2IDj'
  )
  linkedReferenceScope = 'リンク先の全項目を検証済みとして取り込んだものではない。候補として照合し、一次資料で名称・年・年の意味を確認できた38件だけを追加。既存収録項目と同じ事象は重複追加していない。'
  linkedReferenceDeferred = @(
    [ordered]@{ label='非核三原則の国会確認'; reason='表明・決議など年の意味を個別に確定する作業が未完了。' }
    [ordered]@{ label='イラク復興支援特別措置法'; reason='成立と施行の別を個別に照合する作業が未完了。' }
    [ordered]@{ label='中央省庁再編'; reason='省庁ごとの発足と再編全体の実施の区別を個別に照合する作業が未完了。' }
  )
  corrections = @(
    '1945年の女性参政権を認める法改正は、国会・内閣・司法と選挙・政党を1カードに統合。'
    '1946年の女性初参加の衆院選は、国会・内閣・司法と選挙・政党から絞り込めるようにした。'
    '1944年ブレトンウッズ会議、1971年ニクソン・ショック、2008年リーマン・ショック、2015年SDGs採択は関連カテゴリを追加し、重複カードを避けた。'
    '1955年自由民主党結成、1973年第一次石油危機、1985年プラザ合意、1997年アジア通貨危機、2011年東日本大震災は候補中の別表現を統合し、関連カテゴリから絞り込めるようにした。'
  )
  yearOrTitleCorrections = @(
    [ordered]@{ original='アメリカ合衆国憲法の制定'; corrected='アメリカ合衆国憲法への署名'; year=1787; reason='資料が1787年に確認している事実は憲法の署名。発効との混同を避けるため名称とdateTypeを修正。' }
    [ordered]@{ original='武田塾記事: 沖縄返還 1971年'; corrected='沖縄の日本復帰 1972年'; year=1972; reason='1971年は返還協定署名。復帰は協定発効の1972年。'; sourceUrl=$sources.okinawa }
    [ordered]@{ original='Ankilot: 大日本帝国憲法の施行 1889年'; corrected='大日本帝国憲法の施行 1890年'; year=1890; reason='1889年は発布、1890年は施行。'; sourceUrl=$sources.meijiEnforce }
    [ordered]@{ original='Ankilot: 日本の子どもの権利条約批准 1999年'; corrected='日本による子どもの権利条約の批准 1994年'; year=1994; reason='外務省年表で1994年の批准を確認。'; sourceUrl=$sources.crcJapan }
    [ordered]@{ original='Ankilot: ユーロ流通開始 1999年'; corrected='ユーロの導入（電子決済）1999年／ユーロ紙幣・硬貨の流通開始 2002年'; year=1999; reason='「流通開始」だけでは電子決済と現金の区別が曖昧なため、別の出来事として明示。'; sourceUrl=$sources.euro }
  )
  levelPolicy = '4=最優先、3=必須、2=標準、1=補強。学習上の優先度は編集判断であり、史実の検証とは別。旧3の中で細かな条約・制度の区別が必要な項目は下位へ移した。'
  levelChanges = $levelChanges
  excluded = $excluded
}
New-Item -ItemType Directory -Path data -Force | Out-Null
$out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath data/reviewed.json -Encoding utf8
$audit | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath data/review-audit.json -Encoding utf8
Write-Output "Included $($events.Count), excluded $($excluded.Count)"
