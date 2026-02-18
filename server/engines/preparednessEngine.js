/**
 * Preparedness Advisor Engine
 * Generates context-aware, actionable checklists based on disaster type + family profile.
 */

const BASE_CHECKLISTS = {
    Flood: [
        'Move to upper floors or elevated areas',
        'Store 4 litres of drinking water per person per day (minimum 3 days)',
        'Pack waterproof bags with important documents (Aadhaar, insurance, prescriptions)',
        'Charge all mobile phones and portable power banks to 100%',
        'Prepare an emergency go-bag: flashlight, batteries, first-aid kit, whistle',
        'Turn off electrical mains before water enters home',
        'Keep rubber boots and rain gear accessible',
    ],
    Heatwave: [
        'Stay indoors between 11 AM and 4 PM',
        'Prepare ORS solution: 6 tsp sugar + ½ tsp salt in 1L boiled water',
        'Ensure minimum 3 litres water intake per person per day',
        'Soak cotton cloth in cold water — apply to forehead and neck',
        'Close curtains and use wet sheets on windows to cool rooms',
        'Avoid heavy meals — eat fruits, salads, buttermilk',
        'Identify nearest cooling shelter / hospital with AC',
    ],
    Cyclone: [
        'Reinforce doors and windows with plywood or tape',
        'Store 5 days of non-perishable food (biscuits, canned food, dry fruit)',
        'Fill all containers and bathtubs with fresh water',
        'Locate nearest cyclone shelter — plan evacuation route',
        'Secure or bring indoors any loose outdoor objects (chairs, pots, signs)',
        'Keep emergency radio ready with extra batteries',
        'Do NOT go near the coast — stay 500m away from shoreline',
    ],
    None: [
        'Maintain a basic emergency kit at home',
        'Save emergency helpline numbers (112, local disaster cell)',
        'Keep a 3-day supply of water and dry food as a habit',
        'Review home insurance coverage annually',
    ],
};

function generateChecklist({ disasterType, familyMembers = 1, elderly = 0, children = 0, conditions = [] }) {
    const checklist = [...(BASE_CHECKLISTS[disasterType] || BASE_CHECKLISTS.None)];

    // --- Family-size scaling ---
    if (familyMembers > 4) {
        checklist.push(`Increase water stock to ${familyMembers * 4} litres per day`);
        checklist.push('Designate a family meeting point in case of separation');
    }

    // --- Elderly-specific ---
    if (elderly > 0) {
        checklist.push('Ensure all prescribed medications are stocked for 7+ days');
        checklist.push('Keep mobility aids (walker, wheelchair) easily accessible');
        checklist.push('Assign a dedicated family member to assist each elderly person');
        if (disasterType === 'Heatwave') {
            checklist.push('Monitor elderly for signs of heat stroke: confusion, hot dry skin, rapid pulse');
        }
        if (disasterType === 'Flood') {
            checklist.push('Move elderly to upper floor FIRST before securing belongings');
        }
    }

    // --- Children-specific ---
    if (children > 0) {
        checklist.push('Pack child comfort items: snacks, games, favourite toy');
        checklist.push('Keep infant formula / baby food for 5+ days if applicable');
        checklist.push('Prepare child ID card with parent contact info');
        if (disasterType === 'Cyclone') {
            checklist.push('Teach children to cover head and crouch away from windows during high wind');
        }
    }

    // --- Medical condition adjustments ---
    if (conditions.includes('diabetes')) {
        checklist.push('Stock insulin / diabetes medication for minimum 14 days');
        checklist.push('Keep glucose tablets and energy bars in emergency kit');
        checklist.push('Carry sharps disposal container if using insulin pens');
    }
    if (conditions.includes('asthma')) {
        checklist.push('Keep 2+ rescue inhalers in go-bag');
        checklist.push('Pack N95 masks to filter dust / smoke');
        checklist.push('Avoid areas with debris or stagnant water (mould triggers)');
    }
    if (conditions.includes('heart_disease')) {
        checklist.push('Keep nitroglycerin and heart medication within reach');
        checklist.push('Avoid physical exertion during evacuation — ask for assistance');
    }
    if (conditions.includes('hypertension')) {
        checklist.push('Ensure BP medication supply for 14+ days');
        checklist.push('Avoid salty preserved foods during emergency period');
    }

    return {
        disasterType,
        familyProfile: { familyMembers, elderly, children, conditions },
        totalItems: checklist.length,
        checklist,
    };
}

module.exports = { generateChecklist };
