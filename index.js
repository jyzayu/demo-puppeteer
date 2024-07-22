const puppeteer = require('puppeteer');
const url = 'https://www.agoda.com/ko-kr/search?selectedproperty=287988&checkIn=2024-07-30&los=1&rooms=1&adults=1&children=0&cid=1841709&asq=MOon8wZSjpF4gwR86e3SJ5ufa9Vwpz6XltTHq4n%2B9gOyzDMrg3GKrdUjxr85aIvC43K1ztw%2BsDhPq7lzjOgppK9NWUICQBZnHs5ofgYurix4T3sOkk1MmWt5woddkJhShU137%2FMH6ABCN6SY8IWBnJGM3OakZ0OblfBQ7cg5xXqv7OaGZCT3VqGHXBkQSPTQrLe4mlxTT1jEVEymR5wDsJe8Htc4nn36wSFHB1YytNrzKWSfG1we9MkFCkerx6G8rQk5afKasEVWq%2BfTKWKcBA%3D%3D&hotel=287988&locale=ko-kr&ckuid=c61a84c6-e0d4-4a73-a423-f1d6acd7e503&prid=0&gclid=Cj0KCQjwwO20BhCJARIsAAnTIVSYqPs3wZMC0gtb3kqMQS58K0PFWCmcg5uAeB1wrHD5DkwdIDNkH9kaAt0NEALw_wcB&currency=KRW&correlationId=66b22ebf-4e33-4e7a-9f3a-e7ad7b1498af&analyticsSessionId=6131003552115862928&pageTypeId=1&realLanguageId=9&languageId=9&origin=KR&stateCode=41&tag=c58bb181-9c90-7072-a6d7-012f1d388bf8&userId=c61a84c6-e0d4-4a73-a423-f1d6acd7e503&whitelabelid=1&loginLvl=0&storefrontId=3&currencyId=26&currencyCode=KRW&htmlLanguage=ko-kr&cultureInfoName=ko-kr&machineName=hk-pc-2h-acm-web-user-6f558b6f8c-g9mx6&trafficGroupId=5&trafficSubGroupId=9&aid=82361&useFullPageLogin=true&cttp=4&isRealUser=true&mode=production&browserFamily=Chrome&cdnDomain=agoda.net&checkOut=2024-07-31&priceCur=KRW&textToSearch=%ED%9E%88%EB%85%B8%ED%95%98%EB%A3%A8+%EB%A3%8C%EC%B9%B8&travellerType=0&familyMode=off&city=106058&ds=MASd%2Fnxo%2BY%2FGTooD&productType=-1';



(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.on('console', async msg => {
    const args = msg.args();
    const vals = [];
    for (let i = 0; i < args.length; i++) {
      vals.push(await args[i].jsonValue());
    }
    console.log(vals.join('\t'));
  });
  await page.goto(url);
  await page.evaluate(()=> {
    
    const wait = (duration) => { 
      console.log('waiting', duration);
      return new Promise(resolve => setTimeout(resolve, duration)); 
    };

    //scroll down 
    (async () => {
      
        window.atBottom = false;
        const scroller = document.documentElement;  // usually what you want to scroll, but not always
        let lastPosition = -1;
        while(!window.atBottom) {
          scroller.scrollTop += 500;
          // scrolling down all at once has pitfalls on some sites: scroller.scrollTop = scroller.scrollHeight;
          await wait(300);
          const currentPosition = scroller.scrollTop;
          if (currentPosition > lastPosition) {
            console.log('currentPosition', currentPosition);
            lastPosition = currentPosition;
          }
          else {
            window.atBottom = true;
          }
        }
        console.log('Done!');
  
      })();
    });

    await page.waitForFunction('window.atBottom == true', {
        timeout: 900000,
        polling: 1000 // poll for finish every second
    });

    // extract data
    const hotel_names = await page.$$eval('.a9733-box.a9733-fill-inherit .sc-jrAGrp.sc-kEjbxe.eDlaBj.dscgss', h3s => h3s.map(h3 => h3.textContent));
    const scores = await page.$$eval('.Box-sc-kv6pi1-0.ggePrW .Typographystyled__TypographyStyled-sc-j18mtu-0.Hkrzy.kite-js-Typography', ps => ps.map(p => p.innerText));
    const imageUrls = await page.$$eval('img', images => images.map(img => img.src));
    
    // Downloading and saving images to AWS S3
    for (const imageUrl of imageUrls) {
      const buffer = await page.goto(imageUrl, { waitUntil: 'networkidle0' }).then(res => res.buffer());
  
      // Uploading image to AWS S3 bucket
      const uploadParams = {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: `images/${imageUrl.split('/').pop()}`,
        Body: buffer,
        ContentType: 'image/jpeg'
      };
  
      await s3.upload(uploadParams).promise();
      console.log(`Image ${imageUrl} uploaded to AWS S3.`);
  }
  // print data   
    if (hotel_names && scores) {
        for(i=0; i< hotel_names.length; i++) {
            console.log('hotel_name:', hotel_names[i]);
            console.log('score:', scores[i]);
        }
    }
    await new Promise((page) => setTimeout(page, 900000));
    //close
    await page.close();
    await browser.close();
})();



