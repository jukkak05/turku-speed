curl -H "Content-Type: application/xml" -d '
<wfs:GetFeature service="WFS" version="2.0.0"
  xmlns:wfs="http://www.opengis.net/wfs/2.0"
  xmlns:fes="http://www.opengis.net/fes/2.0">
  <wfs:Query typeNames="digiroad:dr_nopeusrajoitus">
    <fes:Filter>
      <fes:PropertyIsEqualTo>
        <fes:ValueReference>kuntakoodi</fes:ValueReference>
        <fes:Literal>853</fes:Literal>
      </fes:PropertyIsEqualTo>
    </fes:Filter>
  </wfs:Query>
</wfs:GetFeature>' \
"https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ows?" -o turku_speedlimits.gml && ogr2ogr -f "GeoJSON" turku_speedlimits.json turku_speedlimits.gml && cp turku_speedlimits.json ../public/
