const h2c = html2canvas as any;

const canvas = await h2c(ticket, {
  scale: 2,
  useCORS: true,
});

interface Window {
  adsbygoogle: any[];
}
