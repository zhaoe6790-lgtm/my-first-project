import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {decodePhoto} from './validation.mjs';
const env=process.env;
let day='',count=0,busy=false;
const ready=()=>['OPENAI_API_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY','TURNSTILE_HOSTNAME','PUBLIC_ORIGIN','PRODUCT_IMAGE_URL'].every(k=>env[k]);
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function json(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>7*1024*1024)throw new Error('Upload too large.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
try {
if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('./index.html',import.meta.url)));return;}
if(req.method==='GET'&&req.url==='/config'){send(res,200,{ready:!!ready(),siteKey:env.TURNSTILE_SITE_KEY||'',title:env.PRODUCT_TITLE||'Mobility Sling'});return;}
if(req.method!=='POST'||req.url!=='/api/try-on'){send(res,404,{error:'Not found'});return;}
if(!ready()){send(res,503,{error:'Try-on is not configured yet.'});return;}
if(req.headers.origin!==env.PUBLIC_ORIGIN){send(res,403,{error:'Request rejected.'});return;}
if(busy){send(res,429,{error:'Another preview is generating. Please try again shortly.'});return;}
const body=await json(req);
if(body.consent!==true)throw new Error('Please accept photo processing before generating.');
const photo=decodePhoto(body.photo);
const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:String(body.token||'')}),signal:AbortSignal.timeout(15000)}).then(r=>r.json());
if(!verify.success||verify.hostname!==env.TURNSTILE_HOSTNAME){send(res,403,{error:'Please complete verification again.'});return;}
const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;count=0;}
if(busy||count>=Number(env.DAILY_LIMIT||20)){send(res,429,{error:'Generation limit reached. Please try later.'});return;}
busy=true;count++;
try {
const imageUrl=new URL(env.PRODUCT_IMAGE_URL);
if(imageUrl.protocol!=='https:'||imageUrl.hostname!=='cdn.shopify.com')throw new Error('Product image configuration is invalid.');
const productResponse=await fetch(imageUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});
if(!productResponse.ok)throw new Error('Product image unavailable.');
const product=await productResponse.blob();
if(product.size>10*1024*1024||!product.type.startsWith('image/'))throw new Error('Invalid product reference.');
const form=new FormData();form.set('model',env.IMAGE_MODEL||'gpt-image-1.5');form.set('size','1024x1024');form.set('quality','medium');form.set('n','1');
form.set('prompt','Create an AI virtual try-on preview. Image 1 is the customer dog; image 2 is the exact pet mobility sling product reference. Preserve the dog identity, fur, body proportions, pose and background. Place the reference sling realistically around the dog, preserving its navy color, construction and straps. Do not add limbs, change the dog anatomy, copy any human from the product reference, or invent product features. This is an appearance illustration, not a sizing or medical assessment.');
form.append('image[]',new Blob([photo.bytes],{type:photo.type}),'dog.'+photo.extension);form.append('image[]',product,'product.png');
const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(180000)});
if(!response.ok){send(res,502,{error:'Image generation failed. Please try again later.'});return;}
const result=await response.json();if(!result.data?.[0]?.b64_json)throw new Error('No preview returned.');
send(res,200,{image:'data:image/png;base64,'+result.data[0].b64_json});
} finally {busy=false;}
}catch(error){send(res,400,{error:['Choose a dog photo.','Use a JPG, PNG or WebP image.','Photo must be under 5 MB.','Invalid image file.','Please accept photo processing before generating.','Upload too large.'].includes(error.message)?error.message:'Unable to generate a preview. Please try again.'});}
});
server.requestTimeout=240000;server.listen(Number(env.PORT||3000),'0.0.0.0',()=>console.log('Try-on server ready; configured:',!!ready()));
