// Destino do frete estimado (E1, ticket 07): CEP comercial do Colégio Estrelas, constante do
// sistema porque não muda. A pesquisa automática simula a entrega até ele com a quantidade
// pedida; a tela mostra o valor somente para leitura. O CEP salvo antes nas Configurações
// (ticket 06, `schoolCep`) fica preservado no banco, sem uso.
export const schoolFreightDestination={cep:'69086-665',city:'Manaus',state:'AM'} as const;
export const schoolFreightDestinationLabel=`CEP ${schoolFreightDestination.cep} (${schoolFreightDestination.city}/${schoolFreightDestination.state})`;
