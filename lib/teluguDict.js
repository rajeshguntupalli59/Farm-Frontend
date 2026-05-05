// Telugu auto-translation dictionary for farm products
// Key: lowercase English name or keyword → Telugu translation
// When user types a product name, we scan for matching keywords and suggest Telugu

export const TELUGU_DICT = {
  // Animals / Meat
  'goat':        'మేక',
  'goat meat':   'మేక మాంసం',
  'mutton':      'మటన్',
  'sheep':       'గొర్రె',
  'sheep meat':  'గొర్రె మాంసం',
  'lamb':        'గొర్రె మాంసం',
  'chicken':     'కోడి మాంసం',
  'hen':         'పెట్ట కోడి',
  'egg':         'గుడ్డు',
  'eggs':        'గుడ్లు',
  'country egg': 'నాటు గుడ్లు',
  'country eggs':'నాటు గుడ్లు',
  'duck':        'బాతు',
  'fish':        'చేపలు',
  'prawn':       'రొయ్యలు',
  'crab':        'పీత',
  'rabbit':      'కుందేలు',
  'cow':         'ఆవు',
  'buffalo':     'గేదె',
  'pork':        'పంది మాంసం',
  'beef':        'గొడ్డు మాంసం',
  'liver':       'కాలేజీ',
  'bone':        'ఎముకలు',
  'turkey':      'టర్కీ',
  'pigeon':      'పావురం',

  // Dairy
  'milk':        'పాలు',
  'cow milk':    'ఆవు పాలు',
  'goat milk':   'మేక పాలు',
  'buffalo milk':'గేదె పాలు',
  'ghee':        'నెయ్యి',
  'butter':      'వెన్న',
  'curd':        'పెరుగు',
  'yogurt':      'పెరుగు',
  'paneer':      'పనీర్',
  'cheese':      'చీజ్',
  'cream':       'క్రీమ్',
  'buttermilk':  'మజ్జిగ',

  // Vegetables
  'tomato':      'టమాటా',
  'onion':       'ఉల్లిపాయ',
  'potato':      'బంగాళాదుంప',
  'brinjal':     'వంకాయ',
  'eggplant':    'వంకాయ',
  'okra':        'బెండకాయ',
  'bhindi':      'బెండకాయ',
  'spinach':     'పాలకూర',
  'carrot':      'క్యారెట్',
  'cucumber':    'దోసకాయ',
  'bottle gourd':'సొరకాయ',
  'bitter gourd':'కాకరకాయ',
  'ridge gourd': 'బీరకాయ',
  'snake gourd': 'పొట్లకాయ',
  'drumstick':   'మునగకాయ',
  'pumpkin':     'గుమ్మడికాయ',
  'raw banana':  'పచ్చి అరటికాయ',
  'raw mango':   'పచ్చి మామిడికాయ',
  'cabbage':     'క్యాబేజీ',
  'cauliflower': 'కాలీఫ్లవర్',
  'beans':       'బీన్స్',
  'peas':        'బఠానీలు',
  'beetroot':    'బీట్రూట్',
  'radish':      'మూలంగి',
  'ladies finger':'బెండకాయ',
  'cluster beans':'గోరుచిక్కుడు',
  'curry leaves':'కరివేపాకు',
  'coriander':   'కొత్తిమీర',
  'mint':        'పుదీనా',
  'ginger':      'అల్లం',
  'garlic':      'వెల్లుల్లి',
  'green chilli':'పచ్చి మిరపకాయ',
  'chilli':      'మిరపకాయ',
  'turmeric':    'పసుపు',
  'fenugreek':   'మెంతులు',

  // Fruits
  'banana':      'అరటిపండు',
  'mango':       'మామిడిపండు',
  'coconut':     'కొబ్బరికాయ',
  'lemon':       'నిమ్మకాయ',
  'guava':       'జామపండు',
  'papaya':      'బొప్పాయి',
  'orange':      'నారంగి',
  'watermelon':  'పుచ్చకాయ',
  'grapes':      'ద్రాక్షపండు',
  'pomegranate': 'దానిమ్మ',
  'apple':       'ఆపిల్',
  'pineapple':   'అనాస',
  'sapota':      'సపోట',

  // Grains / Seeds
  'rice':        'బియ్యం',
  'wheat':       'గోధుమ',
  'maize':       'మొక్కజొన్న',
  'corn':        'మొక్కజొన్న',
  'groundnut':   'వేరుశెనగ',
  'peanut':      'వేరుశెనగ',
  'sesame':      'నువ్వులు',
  'sunflower':   'పొద్దుతిరుగుడు',
  'soybean':     'సోయాబీన్',
  'moong':       'పెసర్లు',
  'urad':        'మినుములు',
  'toor':        'కందిపప్పు',
  'chana':       'శనగలు',

  // Other farm products
  'honey':       'తేనె',
  'jaggery':     'బెల్లం',
  'sugar':       'పంచదార',
  'oil':         'నూనె',
  'coconut oil': 'కొబ్బరి నూనె',
  'feed':        'దాణా',
  'fodder':      'మేత',
  'straw':       'గడ్డి',
  'hay':         'ఎండు గడ్డి',
  'compost':     'కంపోస్ట్',
  'manure':      'ఎరువు',
  'fertilizer':  'రసాయన ఎరువు',
  'fresh':       'తాజా',
  'organic':     'సేంద్రీయ',
  'desi':        'దేశీ',
  'country':     'నాటు',
  'live':        'జీవంతమైన',
}

// Returns Telugu suggestion for a given English product name
// Checks full name first, then individual words
export function suggestTelugu(englishName) {
  if (!englishName || !englishName.trim()) return ''
  const lower = englishName.toLowerCase().trim()

  // Full phrase match first
  if (TELUGU_DICT[lower]) return TELUGU_DICT[lower]

  // Try progressively shorter phrases
  const words = lower.split(' ')
  for (let len = words.length; len >= 1; len--) {
    const phrase = words.slice(0, len).join(' ')
    if (TELUGU_DICT[phrase]) return TELUGU_DICT[phrase]
  }

  // Try each word and combine
  const parts = words.map(w => TELUGU_DICT[w]).filter(Boolean)
  if (parts.length > 0) return parts.join(' ')

  return '' // Not found — user types manually
}
