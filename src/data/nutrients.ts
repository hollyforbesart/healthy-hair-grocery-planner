/**
 * "Food for Your Follicles" — Holly Forbes, RDN. Text extracted from the
 * guide (not the PDF itself) so it reads well on phones. Icons live in
 * public/nutrients/<id>.webp. Keep wording in sync with the guide.
 */
export interface NutrientSection {
  label: string;
  paragraphs: string[];
  /** Shown as a highlighted "find it in" box. */
  highlight?: boolean;
}

export interface Nutrient {
  id: string;
  name: string;
  sections: NutrientSection[];
}

export const NUTRIENTS_INTRO = [
  'Your hair follicles are some of the most active parts of your body. To keep producing hair, they need a steady supply of energy, protein, vitamins, minerals, and essential fats from the foods you eat.',
  'Some nutrients, like protein and carbohydrates, are macronutrients. Your body needs them in larger amounts. Vitamins and minerals are micronutrients. You need much smaller amounts, but they still play important roles in keeping your body and hair follicles working properly.',
  'Nutrition is only one part of hair health, but it is an important part you can participate in. Here are 10 nutrients worth knowing about.',
];

export const NUTRIENTS: Nutrient[] = [
  {
    id: 'protein',
    name: 'Protein',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Your hair is made mostly of a protein called keratin. Your body needs enough protein to build strong hair strands and support normal hair growth. Not eating enough protein can lead to increased shedding and finer, weaker hair.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Beef, lamb, pork, chicken, turkey, fish, eggs, Greek yogurt, cottage cheese, milk, tofu, tempeh, edamame, beans, lentils, nuts, and seeds.',
        ],
      },
      {
        label: 'Put it into practice',
        paragraphs: [
          'Include a source of protein each time you eat. Spreading protein throughout the day can make it easier to consistently meet your needs.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          "You don't need protein powder to support healthy hair, but if you have trouble getting enough protein from food, a protein shake or powder can be a convenient way to help fill the gap.",
        ],
      },
    ],
  },
  {
    id: 'carbohydrates',
    name: 'Carbohydrates',
    sections: [
      {
        label: 'Why your follicles need them',
        paragraphs: [
          "Carbohydrates are your body's main source of energy. Your body breaks them down into glucose, which your cells can use for energy right away or store for later. Your hair follicles need this energy to keep producing new hair.",
          "When your body isn't getting enough food and energy, it has to be more selective about where energy goes. Essential functions, like keeping your heart beating, brain working, and organs functioning, take priority. Growing hair is important to us, but it isn't necessary to keep the body functioning, so hair growth can be affected when energy is limited.",
          'Over time, not eating enough or following a very restrictive diet can disrupt the normal hair growth cycle. More hairs may leave the growing phase and enter the resting and shedding phases, which is why increased shedding may not become noticeable until a few months after the change in your diet.',
        ],
      },
      {
        label: 'Find them in',
        highlight: true,
        paragraphs: ['Oats, rice, quinoa, bread, pasta, potatoes, sweet potatoes, corn, beans, lentils, fruit, and other grains.'],
      },
      {
        label: 'Put it into practice',
        paragraphs: [
          "Carbohydrates shouldn't be avoided, as they're needed for healthy hair. Include carbohydrate foods regularly and choose a variety of whole grains, beans, fruit, and starchy vegetables.",
        ],
      },
    ],
  },
  {
    id: 'iron',
    name: 'Iron',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Iron helps your red blood cells carry oxygen throughout your body, including to your hair follicles. When your iron stores are low, it can contribute to diffuse hair shedding.',
          'Ferritin is a protein that stores iron in your body. A ferritin blood test can help show how much iron you have stored.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Beef, chicken, turkey, sardines, tuna, eggs, oysters, lentils, white beans, kidney beans, chickpeas, tofu, spinach, green peas, potatoes, cashews, whole-wheat bread, and iron-fortified breakfast cereals.',
        ],
      },
      {
        label: 'Put it into practice',
        paragraphs: [
          'Your body absorbs iron from animal foods more easily than iron from plant foods. Eating vitamin C-rich foods with plant sources of iron helps your body absorb more of it.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          'If your ferritin or other iron markers are low, iron supplementation may be helpful. But it is important to also figure out why your iron is low, such as heavy menstrual bleeding, low dietary intake, blood loss, or problems with absorption, so the underlying issue can be addressed too.',
        ],
      },
    ],
  },
  {
    id: 'zinc',
    name: 'Zinc',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Zinc helps your body make proteins and new cells, two things your follicles need to produce hair. Not getting enough zinc can weaken the hair and contribute to hair loss.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Beef, pork, turkey, shrimp, sardines, oysters, Greek yogurt, cheddar cheese, lentils, oats, pumpkin seeds, and zinc-fortified breakfast cereals.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          "Zinc supplements can be useful when you aren't getting enough or have a deficiency, but taking too much for too long can interfere with your body's ability to absorb copper.",
        ],
      },
    ],
  },
  {
    id: 'vitamin-d',
    name: 'Vitamin D',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Your hair follicles have receptors for vitamin D, and vitamin D plays a role in the normal hair growth cycle. Low vitamin D is commonly seen in people with several types of hair loss.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          "Salmon, trout, tuna, sardines, eggs, and mushrooms exposed to UV light. Vitamin D is also added to cow's milk, many plant milks, and some breakfast cereals.",
        ],
      },
      {
        label: 'What about sunlight?',
        paragraphs: [
          'Your skin can make vitamin D when it is exposed to sunlight, but the amount you make varies. Your skin color, where you live, the time of year, time of day, age, sunscreen use, how much skin is exposed, and how much time you spend outdoors impact the amount of vitamin D you are able to make.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: ['Vitamin D can be difficult to get from food alone, and supplements are often recommended when levels are low.'],
      },
    ],
  },
  {
    id: 'vitamin-b12',
    name: 'Vitamin B12',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Your hair follicles are constantly making new cells. Vitamin B12 helps your body make DNA for those new cells and healthy red blood cells that carry oxygen throughout your body. A B12 deficiency can lead to anemia and may contribute to diffuse hair loss.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Salmon, tuna, beef, eggs, milk, yogurt, cheddar cheese, clams, and oysters. Fortified nutritional yeast and fortified breakfast cereals can also provide B12.',
          'Plant foods do not naturally contain B12 unless they are fortified. Fortified means a nutrient has been added to the food to increase the amount it provides.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          'Pay extra attention to B12 if you eat little or no animal food, have had bariatric or gastrointestinal surgery, have a condition that affects absorption, or take medications that can affect B12 levels.',
          "If you aren't getting enough or have trouble absorbing B12, fortified foods or a B12 supplement can help you meet your needs.",
        ],
      },
    ],
  },
  {
    id: 'vitamin-c',
    name: 'Vitamin C',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Vitamin C helps your body make collagen, a protein that supports the tissues around your hair follicles. It also helps your body absorb iron from plant foods and works as an antioxidant that helps protect your cells from damage.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Oranges, grapefruit, kiwi, strawberries, cantaloupe, red and green bell peppers, broccoli, Brussels sprouts, cabbage, cauliflower, tomatoes, and potatoes.',
        ],
      },
      {
        label: 'Put it into practice',
        paragraphs: [
          'Pair vitamin C-rich foods with plant sources of iron. This simple combination helps your body absorb more of the iron in your meal.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          'Most people can get enough vitamin C by regularly eating fruits and vegetables. A supplement may be useful when your diet is very limited or you have a health condition that makes it harder to get or absorb enough vitamin C.',
        ],
      },
    ],
  },
  {
    id: 'biotin',
    name: 'Biotin',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Biotin is a B vitamin that helps your body turn carbohydrates, fats, and proteins into energy. A true biotin deficiency can cause thinning hair, but deficiency is rare.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: ['Eggs, salmon, tuna, pork, beef, sunflower seeds, sweet potatoes, and almonds.'],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          "Biotin gets a lot of attention in hair supplements, but taking more isn't automatically better for your hair. If you're already getting enough biotin, extra biotin hasn't been shown to improve hair growth.",
          'High-dose biotin supplements can also interfere with certain blood tests.',
        ],
      },
    ],
  },
  {
    id: 'omega-3',
    name: 'Omega-3 Fatty Acids',
    sections: [
      {
        label: 'Why your follicles need them',
        paragraphs: [
          'Omega-3s are essential fats that help make up the outer layer of your cells and help your body manage inflammation. They also support the health of your skin and scalp.',
          'There are three main types of omega-3s you may see listed on foods or supplements:',
          "ALA (alpha-linolenic acid) is the type found mainly in plant foods. ALA is an essential fat, which means your body can't make it and you have to get it from food.",
          'EPA (eicosapentaenoic acid) and DHA (docosahexaenoic acid) are found mainly in fish and seafood.',
          "Your body can turn some ALA into EPA and DHA, but only in small amounts. That's why it helps to know which type of omega-3 you're getting from your food.",
        ],
      },
      {
        label: 'Find them in',
        highlight: true,
        paragraphs: [
          'Salmon, mackerel, tuna, herring, and sardines provide EPA and DHA. Flaxseed, chia seeds, walnuts, soybean oil, and canola oil provide ALA.',
        ],
      },
      {
        label: 'Put it into practice',
        paragraphs: [
          "If you eat fish, fatty fish is the most direct food source of EPA and DHA. If you don't eat fish, regularly include foods that provide ALA, such as chia seeds, ground flaxseed, and walnuts.",
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          'If you rarely or never eat fish, an omega-3 supplement may be worth considering. Fish oil provides EPA and DHA, while algae-based supplements are a fish-free option.',
        ],
      },
    ],
  },
  {
    id: 'folate',
    name: 'Folate',
    sections: [
      {
        label: 'Why your follicles need it',
        paragraphs: [
          'Your hair follicles are constantly making new cells as they grow new hair. Folate helps your body make the DNA those new cells need and helps them divide and multiply. Getting enough folate helps your follicles continue this process as they produce hair.',
        ],
      },
      {
        label: 'Find it in',
        highlight: true,
        paragraphs: [
          'Spinach, asparagus, Brussels sprouts, broccoli, avocado, black-eyed peas, kidney beans, green beans, peanuts, oranges, papaya, and eggs.',
          'Folic acid, a form of folate, is also added to many enriched breads, flour, pasta, and rice, as well as fortified breakfast cereals.',
        ],
      },
      {
        label: 'Supplement smart',
        paragraphs: [
          'Folic acid supplementation is especially important before and during pregnancy because adequate folate helps prevent neural tube defects.',
          'Outside of pregnancy and other specific needs, a varied diet and fortified foods can provide folate for many people.',
        ],
      },
    ],
  },
];

export const SUPPLEMENT_NOTE = {
  title: 'A note about supplements',
  paragraphs: [
    "When it comes to supplements, more isn't always better. The goal is to get enough of each nutrient to meet your body's needs. Taking extra when you're already getting enough does not necessarily provide additional benefits and, for some nutrients, too much can be harmful.",
    "Supplements can be helpful when they fill a nutrient deficiency, low intake, or other gap that food alone isn't meeting. The amount you need depends on the nutrient and your individual situation, including your diet, bloodwork, health history, medications, life stage, and how well your body absorbs nutrients.",
    'There is no single supplement dose that is right for everyone. If a supplement is needed to correct a deficiency, the appropriate amount and how long you need to take it should be based on your individual needs.',
    'This guide is for general education and is not a personalized nutrition or supplement plan.',
  ],
};
