## Inspiration

In the era of data-driven technology, the invisible environmental cost of online activities is escalating due to the significant energy consumption of data centers. Our digital activities, despite their common consideration as having a minimal environmental impact, actually contribute significantly to our carbon footprint. From the emissions needed to produce the electricity that powers data centers to the energy needed for data servers to transmit data across the globe, this is an important, yet widely unknown problem. Recognizing the gap in tools that measure digital carbon emissions comprehensively, our browser extension was created to illuminate the carbon footprint of users' entire web browsing sessions, not just individual websites. I created Green Meter to empower users to make more eco-conscious decisions and reduce this critical footprint.

## What it does

Addressing two key questions—how to raise individual awareness and educate on carbon intensity—this tool calculates and displays CO2 equivalent emissions in real-time. Green Meter is one of the sole applications specialized for tracking and visualizing the carbon emissions involved in strictly online activities. It provides real-time data on the energy consumption and carbon footprint of web browsing sessions. The app equates digital emissions to relatable metrics for the user, like the number of trees needed to offset the carbon released, and a simplified visual representation, to create a tangible connection between users' online behaviour and its environmental impact. Our extension also guides users towards eco-friendlier online habits, promoting sustainable digital choices. Designed for ease of use, its accessibility ensures that anyone can install and utilize it with minimal effort, thus democratizing the path to a greener digital footprint.

## How we built it

We developed Green Meter as a Chrome extension using JavaScript, HTML, and CSS. We integrated the ElectricityMaps API for real-time carbon intensity data and used the standard 0.81 kWh/GB energy-to-data ratio to calculate the electricity usage for data transfer. The extension updates dynamically to reflect the user's browsing session.

## Challenges we ran into

Accurately tracking and converting the data transfer into carbon emissions was hard considering the variable carbon intensity of electricity in different regions. We had to integrate with API to based on country data get the right figures.

## Accomplishments that we're proud of

I'm proud of creating an intuitive, educational, well-functional tool that increases awareness & provides actionable insights into reducing one's digital carbon footprint. I’m also proud about the accuracy of the data given the unconventional and undocumented nature of accurately converting digital activity to a CO2 emission equivalent and also through our successful despite challenges integration of the ElectricityMaps API to ensure utmost data accuracy

## What we learned

So much. This was my first chrome extension and there were many bugs. API implementation was very hard but I definitely learned a lot in overcoming these challenges. What's next for Green Meter Simple but very powerful, the extension could be expanded to incorporate more comprehensive analysis and visualization of data to better represent the user’s total carbon imprint. Visual comparisons of time and emissions on different websites would enable users to make more conscious choices and avoid those websites with excessive carbon impact. A bar graph showing the carbon imprint of the user’s activities for each day in the week outside of that of just the current session could be beneficial. Cross-platform integration of phone and computer could also help better represent emission impact. Outside of semantics, future versions could let users set daily carbon emission limits and alert them upon reaching these. Currently, the plugin doesn't track data uploads due to their minimal internet traffic share which could certainly be something to fix in the future.
