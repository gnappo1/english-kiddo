// lessons.js

export const LESSONS = [
    {
        id: "home-basics",
        type: "vocab",
        title: "Home basics",
        unlockCoins: 0,
        items: [
            { id: "house", word: "house", ipa: "/haʊs/", image: "./assets/vocab/home-basics/house.webp" },
            { id: "door", word: "door", ipa: "/dɔr/", image: "./assets/vocab/home-basics/door.webp" },
            { id: "window", word: "window", ipa: "/ˈwɪn.doʊ/", image: "./assets/vocab/home-basics/window.webp" },
            { id: "bed", word: "bed", ipa: "/bɛd/", image: "./assets/vocab/home-basics/bed.webp" },
            { id: "chair", word: "chair", ipa: "/tʃɛr/", image: "./assets/vocab/home-basics/chair.webp" },
            { id: "table", word: "table", ipa: "/ˈteɪ.bəl/", image: "./assets/vocab/home-basics/table.webp" }
        ]
    },

    {
        id: "school-stuff",
        type: "vocab",
        title: "School stuff",
        unlockCoins: 15,
        items: [
            { id: "school", word: "school", ipa: "/skuːl/", image: "./assets/vocab/school-stuff/school.webp" },
            { id: "student", word: "student", ipa: "/ˈstuː.dənt/", image: "./assets/vocab/school-stuff/student.webp" },
            { id: "teacher", word: "teacher", ipa: "/ˈtiː.tʃɚ/", image: "./assets/vocab/school-stuff/teacher.webp" },
            { id: "book", word: "book", ipa: "/bʊk/", image: "./assets/vocab/school-stuff/book.webp" },
            { id: "pencil", word: "pencil", ipa: "/ˈpɛn.səl/", image: "./assets/vocab/school-stuff/pencil.webp" },
            { id: "backpack", word: "backpack", ipa: "/ˈbækˌpæk/", image: "./assets/vocab/school-stuff/backpack.webp" }
        ]
    },

    {
        id: "people",
        type: "vocab",
        title: "People",
        unlockCoins: 25,
        items: [
            { id: "girl", word: "girl", ipa: "/ɡɝːl/", image: "./assets/vocab/people/girl.webp" },
            { id: "boy", word: "boy", ipa: "/bɔɪ/", image: "./assets/vocab/people/boy.webp" },
            { id: "mom", word: "mom", ipa: "/mɑm/", image: "./assets/vocab/people/mom.webp" },
            { id: "dad", word: "dad", ipa: "/dæd/", image: "./assets/vocab/people/dad.webp" },
            { id: "sister", word: "sister", ipa: "/ˈsɪs.tɚ/", image: "./assets/vocab/people/sister.webp" },
            { id: "brother", word: "brother", ipa: "/ˈbrʌð.ɚ/", image: "./assets/vocab/people/brother.webp" }
        ]
    },

    {
        id: "food-drink",
        type: "vocab",
        title: "Food and drink",
        unlockCoins: 40,
        items: [
            { id: "water", word: "water", ipa: "/ˈwɔː.tɚ/", image: "./assets/vocab/food-drink/water.webp" },
            { id: "milk", word: "milk", ipa: "/mɪlk/", image: "./assets/vocab/food-drink/milk.webp" },
            { id: "apple", word: "apple", ipa: "/ˈæp.əl/", image: "./assets/vocab/food-drink/apple.webp" },
            { id: "banana", word: "banana", ipa: "/bəˈnæn.ə/", image: "./assets/vocab/food-drink/banana.webp" },
            { id: "bread", word: "bread", ipa: "/brɛd/", image: "./assets/vocab/food-drink/bread.webp" },
            { id: "pizza", word: "pizza", ipa: "/ˈpiːt.sə/", image: "./assets/vocab/food-drink/pizza.webp" }
        ]
    },

    {
        id: "colors",
        type: "vocab",
        title: "Colors",
        unlockCoins: 55,
        items: [
            { id: "red", word: "red", ipa: "/rɛd/", image: "./assets/vocab/colors/red.webp" },
            { id: "blue", word: "blue", ipa: "/bluː/", image: "./assets/vocab/colors/blue.webp" },
            { id: "green", word: "green", ipa: "/ɡriːn/", image: "./assets/vocab/colors/green.webp" },
            { id: "yellow", word: "yellow", ipa: "/ˈjɛl.oʊ/", image: "./assets/vocab/colors/yellow.webp" },
            { id: "pink", word: "pink", ipa: "/pɪŋk/", image: "./assets/vocab/colors/pink.webp" },
            { id: "black", word: "black", ipa: "/blæk/", image: "./assets/vocab/colors/black.webp" }
        ]
    },

    {
        id: "adjectives",
        type: "vocab",
        title: "Describing words",
        unlockCoins: 70,
        items: [
            { id: "big", word: "big", ipa: "/bɪɡ/", image: "./assets/vocab/adjectives/big.webp" },
            { id: "small", word: "small", ipa: "/smɔːl/", image: "./assets/vocab/adjectives/small.webp" },
            { id: "happy", word: "happy", ipa: "/ˈhæp.i/", image: "./assets/vocab/adjectives/happy.webp" },
            { id: "sad", word: "sad", ipa: "/sæd/", image: "./assets/vocab/adjectives/sad.webp" },
            { id: "hot", word: "hot", ipa: "/hɑt/", image: "./assets/vocab/adjectives/hot.webp" },
            { id: "cold", word: "cold", ipa: "/koʊld/", image: "./assets/vocab/adjectives/cold.webp" }
        ]
    },

    {
        id: "prepositions",
        type: "vocab",
        title: "Prepositions (scenes)",
        unlockCoins: 90,
        items: [
            { id: "in", word: "in", ipa: "/ɪn/", image: "./assets/vocab/prepositions/in.webp" },
            { id: "out", word: "out", ipa: "/aʊt/", image: "./assets/vocab/prepositions/out.webp" },
            { id: "on", word: "on", ipa: "/ɑn/", image: "./assets/vocab/prepositions/on.webp" },
            { id: "under", word: "under", ipa: "/ˈʌn.dɚ/", image: "./assets/vocab/prepositions/under.webp" },
            { id: "behind", word: "behind", ipa: "/bɪˈhaɪnd/", image: "./assets/vocab/prepositions/behind.webp" },
            { id: "next-to", word: "next to", ipa: "/nɛkst tuː/", image: "./assets/vocab/prepositions/next-to.webp" },
            { id: "in-front-of", word: "in front of", ipa: "/ɪn frʌnt əv/", image: "./assets/vocab/prepositions/in-front-of.webp" }
        ]
    },

    {
        id: "minimal-pairs-1",
        type: "minimalPairs",
        title: "Sound lab (common mistakes)",
        unlockCoins: 110,
        groups: [
            {
                title: "Ship vs sheep",
                tip: "Short /ɪ/ is quick. Long /iː/ is a smile sound.",
                pairs: [
                    { a: "ship", b: "sheep" },
                    { a: "sit", b: "seat" }
                ]
            },
            {
                title: "Hat vs heart",
                tip: "/æ/ is open. /ɑː/ is deeper.",
                pairs: [
                    { a: "hat", b: "heart" },
                    { a: "cap", b: "carp" }
                ]
            },
            {
                title: "Live vs leave",
                tip: "/iː/ is longer.",
                pairs: [
                    { a: "live", b: "leave" },
                    { a: "bit", b: "beat" }
                ]
        }
        ]
    }
];

export const STICKER_SCENES = [
    { id: "meadow", title: "Meadow", unlockCoins: 0, image: "./assets/scenes/meadow.webp" },
    { id: "space", title: "Space", unlockCoins: 30, image: "./assets/scenes/space.webp" },
    { id: "beach", title: "Beach", unlockCoins: 60, image: "./assets/scenes/beach.webp" }
];

export const STICKERS = [
    { id: "star", label: "Star", unlockCoins: 0, image: "./assets/stickers/star.webp" },
    { id: "heart", label: "Heart", unlockCoins: 10, image: "./assets/stickers/heart.webp" },
    { id: "rocket", label: "Rocket", unlockCoins: 25, image: "./assets/stickers/rocket.webp" },
    { id: "cat", label: "Cat", unlockCoins: 40, image: "./assets/stickers/cat.webp" },
    { id: "crown", label: "Crown", unlockCoins: 55, image: "./assets/stickers/crown.webp" },
    { id: "trophy", label: "Trophy", unlockCoins: 75, image: "./assets/stickers/trophy.webp" }
];
