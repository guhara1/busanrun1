export const onRequest = () => new Response('PING OK\n', {
  headers: { 'Content-Type': 'text/plain' }
});
